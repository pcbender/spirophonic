import type { InstrumentSpec } from '../core/composition'
import {
  soundingEvents,
  type CanonicalPerformance,
  type NoteMusicalEvent,
} from '../core/performance'
import { beatsToSeconds, secondsToBeats } from '../core/transport'
import type { InstrumentEngine } from './instrumentEngine'
import {
  scheduledModulationForOccurrence,
  type InstrumentAutomationDiagnostic,
} from './instrumentEngine'

export type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'disposed'

export type SchedulerClock = Readonly<{
  setInterval: (callback: () => void, milliseconds: number) => unknown
  clearInterval: (handle: unknown) => void
}>

export type PerformanceStartOptions = Readonly<{
  tempoBpm: number
  loop?: boolean
  positionSeconds?: number
}>

export type PerformanceEditBoundary =
  | Readonly<{ kind: 'next-beat' }>
  | Readonly<{ kind: 'absolute-beat'; absoluteBeat: number }>

export type PerformanceSchedulerOptions = Readonly<{
  lookaheadSeconds?: number
  tickMilliseconds?: number
  startDelaySeconds?: number
  clock?: SchedulerClock
}>

type EventOccurrence = {
  event: NoteMusicalEvent
  nextTimelineSeconds: number
  /** Present only for the one clipped voice recreated by a mid-note seek. */
  resumeTimelineSeconds?: number
}

type PendingPerformance = Readonly<{
  performance: CanonicalPerformance
  instruments: ReadonlyMap<string, InstrumentSpec>
  boundaryTimelineSeconds: number
}>

const epsilon = 1e-9

const systemClock: SchedulerClock = {
  setInterval: (callback, milliseconds) =>
    globalThis.setInterval(callback, milliseconds),
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
}

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

const compareEvents = (left: NoteMusicalEvent, right: NoteMusicalEvent) =>
  left.timeSeconds - right.timeSeconds ||
  compareText(left.partId, right.partId) ||
  compareText(left.sourceEncounterId, right.sourceEncounterId) ||
  compareText(left.id, right.id)

const requirePositive = (value: number, name: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`)
  }
  return value
}

const requireNonNegative = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`)
  }
  return value
}

const indexInstruments = (
  performance: CanonicalPerformance,
  instruments: ReadonlyArray<InstrumentSpec>,
) => {
  const indexed = new Map<string, InstrumentSpec>()
  for (const instrument of instruments) {
    if (indexed.has(instrument.id)) {
      throw new RangeError(`Instrument id ${instrument.id} is duplicated.`)
    }
    indexed.set(instrument.id, instrument)
  }

  for (const event of performance.performedEvents) {
    if (!indexed.has(event.instrumentId)) {
      throw new RangeError(
        `Event ${event.id} references missing instrument ${event.instrumentId}.`,
      )
    }
  }
  return indexed
}

/**
 * Converts canonical performance time into absolute engine timestamps. Timer
 * callbacks only top up the look-ahead window; they never determine note time.
 */
export class PerformanceScheduler {
  private readonly engine: InstrumentEngine
  private readonly clock: SchedulerClock
  private readonly lookaheadSeconds: number
  private readonly tickMilliseconds: number
  private readonly startDelaySeconds: number
  private statusValue: PlaybackStatus = 'stopped'
  private performance: CanonicalPerformance | null = null
  private instruments: ReadonlyMap<string, InstrumentSpec> = new Map()
  private tempoBpm = 120
  private looping = false
  private heldTimelineSeconds = 0
  private anchorAudioSeconds = 0
  private anchorTimelineSeconds = 0
  private timer: unknown = null
  private occurrences: Array<EventOccurrence> = []
  private pending: PendingPerformance | null = null
  private automationDiagnosticsValue: Array<InstrumentAutomationDiagnostic> = []

  constructor(
    engine: InstrumentEngine,
    options: PerformanceSchedulerOptions = {},
  ) {
    this.engine = engine
    this.clock = options.clock ?? systemClock
    this.lookaheadSeconds = requirePositive(
      options.lookaheadSeconds ?? 0.25,
      'lookaheadSeconds',
    )
    this.tickMilliseconds = requirePositive(
      options.tickMilliseconds ?? 60,
      'tickMilliseconds',
    )
    this.startDelaySeconds = requireNonNegative(
      options.startDelaySeconds ?? 0.05,
      'startDelaySeconds',
    )
  }

  get status() {
    return this.statusValue
  }

  get loop() {
    return this.looping
  }

  get positionSeconds() {
    if (!this.performance) return 0
    const timeline =
      this.statusValue === 'playing'
        ? this.timelineAt(this.engine.currentTimeSeconds)
        : this.heldTimelineSeconds
    return this.normalizePosition(timeline)
  }

  get pendingBoundarySeconds() {
    return this.pending?.boundaryTimelineSeconds ?? null
  }

  get automationDiagnostics() {
    return Object.freeze([...this.automationDiagnosticsValue])
  }

  async start(
    performance: CanonicalPerformance,
    instruments: ReadonlyArray<InstrumentSpec>,
    options: PerformanceStartOptions,
  ) {
    this.assertUsable()
    const indexed = indexInstruments(performance, instruments)
    requirePositive(options.tempoBpm, 'tempoBpm')

    this.clearTimer()
    this.engine.cancelScheduledFrom(this.engine.currentTimeSeconds)
    this.engine.panic(this.engine.currentTimeSeconds)
    this.performance = performance
    this.instruments = indexed
    this.tempoBpm = options.tempoBpm
    this.looping = options.loop ?? false
    this.pending = null
    this.automationDiagnosticsValue = []
    this.heldTimelineSeconds = this.normalizePosition(
      options.positionSeconds ?? performance.request.startSeconds,
    )

    await this.engine.resume()
    this.anchorAudioSeconds =
      this.engine.currentTimeSeconds + this.startDelaySeconds
    this.anchorTimelineSeconds = this.heldTimelineSeconds
    this.statusValue = 'playing'
    this.resetOccurrences(this.anchorTimelineSeconds)
    this.scheduleTick()
    this.startTimer()
  }

  async pause() {
    this.assertUsable()
    if (this.statusValue !== 'playing') return

    const now = this.engine.currentTimeSeconds
    this.heldTimelineSeconds = this.timelineAt(now)
    this.clearTimer()
    this.engine.cancelScheduledFrom(now)
    this.engine.panic(now)
    this.statusValue = 'paused'
    await this.engine.suspend()
  }

  async resume() {
    this.assertUsable()
    if (this.statusValue !== 'paused') return

    await this.engine.resume()
    this.anchorAudioSeconds =
      this.engine.currentTimeSeconds + this.startDelaySeconds
    this.anchorTimelineSeconds = this.heldTimelineSeconds
    this.statusValue = 'playing'
    this.resetOccurrences(this.anchorTimelineSeconds)
    this.scheduleTick()
    this.startTimer()
  }

  seek(positionSeconds: number) {
    this.assertUsable()
    if (!this.performance) return

    this.heldTimelineSeconds = this.normalizePosition(positionSeconds)
    this.pending = null
    if (this.statusValue !== 'playing') return

    const now = this.engine.currentTimeSeconds
    this.engine.cancelScheduledFrom(now)
    this.engine.panic(now)
    this.anchorAudioSeconds = now + this.startDelaySeconds
    this.anchorTimelineSeconds = this.heldTimelineSeconds
    this.resetOccurrences(this.anchorTimelineSeconds)
    this.scheduleTick()
  }

  setLoop(loop: boolean) {
    this.assertUsable()
    if (!this.performance || loop === this.looping) return

    const current =
      this.statusValue === 'playing'
        ? this.timelineAt(this.engine.currentTimeSeconds)
        : this.heldTimelineSeconds
    const now = this.engine.currentTimeSeconds
    if (this.statusValue === 'playing') {
      this.engine.cancelScheduledFrom(now)
      this.engine.panic(now)
    }

    this.looping = loop
    this.heldTimelineSeconds = this.normalizePosition(current)
    if (this.statusValue === 'playing') {
      this.anchorAudioSeconds = now + this.startDelaySeconds
      this.anchorTimelineSeconds = this.heldTimelineSeconds
      this.resetOccurrences(this.anchorTimelineSeconds)
      this.scheduleTick()
    }
  }

  queuePerformance(
    performance: CanonicalPerformance,
    instruments: ReadonlyArray<InstrumentSpec>,
    boundary: PerformanceEditBoundary = { kind: 'next-beat' },
  ) {
    this.assertUsable()
    const currentPerformance = this.performance
    const indexed = indexInstruments(performance, instruments)
    if (!currentPerformance) {
      this.performance = performance
      this.instruments = indexed
      this.heldTimelineSeconds = performance.request.startSeconds
      this.pending = null
      return
    }
    if (
      performance.request.startSeconds !==
        currentPerformance.request.startSeconds ||
      performance.request.durationSeconds !==
        currentPerformance.request.durationSeconds
    ) {
      throw new RangeError(
        'A live performance edit must preserve the active request window.',
      )
    }
    if (this.statusValue !== 'playing') {
      this.performance = performance
      this.instruments = indexed
      this.heldTimelineSeconds = this.normalizePosition(
        this.heldTimelineSeconds,
      )
      this.pending = null
      return
    }

    const currentTimeline = this.timelineAt(this.engine.currentTimeSeconds)
    const currentBeat = secondsToBeats(currentTimeline, this.tempoBpm)
    const boundaryBeat =
      boundary.kind === 'next-beat'
        ? Math.floor(currentBeat + epsilon) + 1
        : boundary.absoluteBeat
    if (!Number.isFinite(boundaryBeat) || boundaryBeat <= currentBeat + epsilon) {
      throw new RangeError('The edit boundary must be a future absolute beat.')
    }

    this.pending = Object.freeze({
      performance,
      instruments: indexed,
      boundaryTimelineSeconds: beatsToSeconds(boundaryBeat, this.tempoBpm),
    })
    this.scheduleTick()
  }

  panic() {
    this.assertUsable()
    const now = this.engine.currentTimeSeconds
    const timeline =
      this.statusValue === 'playing'
        ? this.timelineAt(now)
        : this.heldTimelineSeconds
    this.engine.cancelScheduledFrom(now)
    this.engine.panic(now)

    if (this.statusValue === 'playing') {
      this.anchorAudioSeconds = now + this.startDelaySeconds
      this.anchorTimelineSeconds = timeline
      this.resetOccurrences(timeline)
      this.scheduleTick()
    }
  }

  async stop() {
    if (this.statusValue === 'disposed') return

    this.clearTimer()
    const now = this.engine.currentTimeSeconds
    this.engine.cancelScheduledFrom(now)
    this.engine.panic(now)
    this.pending = null
    this.statusValue = 'stopped'
    this.heldTimelineSeconds = this.performance?.request.startSeconds ?? 0
    await this.engine.suspend()
  }

  async dispose() {
    if (this.statusValue === 'disposed') return
    await this.stop()
    this.statusValue = 'disposed'
    this.performance = null
    this.instruments = new Map()
    this.occurrences = []
    await this.engine.dispose()
  }

  private startTimer() {
    if (this.timer !== null) return
    this.timer = this.clock.setInterval(
      () => this.scheduleTick(),
      this.tickMilliseconds,
    )
  }

  private clearTimer() {
    if (this.timer === null) return
    this.clock.clearInterval(this.timer)
    this.timer = null
  }

  private scheduleTick() {
    if (this.statusValue !== 'playing' || !this.performance) return

    const now = this.engine.currentTimeSeconds
    const horizon = now + this.lookaheadSeconds
    this.applyPendingIfDue(horizon)

    while (true) {
      const occurrence = this.nextOccurrence()
      if (!occurrence) return

      const audioTime =
        this.anchorAudioSeconds +
        occurrence.nextTimelineSeconds -
        this.anchorTimelineSeconds
      if (audioTime > horizon + epsilon) return

      const instrument = this.instruments.get(occurrence.event.instrumentId)
      if (!instrument) {
        throw new Error(
          `Scheduled event ${occurrence.event.id} lost instrument ${occurrence.event.instrumentId}.`,
        )
      }
      const resumeTimelineSeconds =
        occurrence.resumeTimelineSeconds ?? occurrence.event.timeSeconds
      const scheduledEvent = occurrence.resumeTimelineSeconds === undefined
        ? occurrence.event
        : Object.freeze({
            ...occurrence.event,
            durationSeconds: Math.max(
              0,
              occurrence.event.timeSeconds +
                occurrence.event.durationSeconds -
                resumeTimelineSeconds,
            ),
            durationBeats: secondsToBeats(
              Math.max(
                0,
                occurrence.event.timeSeconds +
                  occurrence.event.durationSeconds -
                  resumeTimelineSeconds,
              ),
              this.tempoBpm,
            ),
          })
      const lanes = scheduledModulationForOccurrence(
        this.performance.modulationLanes,
        occurrence.event.id,
        audioTime,
        resumeTimelineSeconds,
      )
      const issues = this.engine.schedule(
        scheduledEvent,
        instrument,
        audioTime,
        lanes,
      )
      if (Array.isArray(issues)) {
        this.addAutomationDiagnostics(
          issues as ReadonlyArray<InstrumentAutomationDiagnostic>,
        )
      }
      if (occurrence.resumeTimelineSeconds !== undefined) {
        occurrence.nextTimelineSeconds = Number.POSITIVE_INFINITY
      } else {
        occurrence.nextTimelineSeconds = this.looping
          ? occurrence.nextTimelineSeconds +
            this.performance.request.durationSeconds
          : Number.POSITIVE_INFINITY
      }
    }
  }

  private applyPendingIfDue(horizonAudioSeconds: number) {
    const pending = this.pending
    if (!pending) return

    const boundaryAudioSeconds =
      this.anchorAudioSeconds +
      pending.boundaryTimelineSeconds -
      this.anchorTimelineSeconds
    if (boundaryAudioSeconds > horizonAudioSeconds + epsilon) return

    this.engine.cancelScheduledFrom(boundaryAudioSeconds)
    this.performance = pending.performance
    this.instruments = pending.instruments
    this.anchorAudioSeconds = boundaryAudioSeconds
    this.anchorTimelineSeconds = pending.boundaryTimelineSeconds
    this.pending = null
    this.automationDiagnosticsValue = []
    this.resetOccurrences(this.anchorTimelineSeconds, false)
  }

  private nextOccurrence() {
    let next: EventOccurrence | null = null
    for (const occurrence of this.occurrences) {
      if (
        Number.isFinite(occurrence.nextTimelineSeconds) &&
        (!next ||
          occurrence.nextTimelineSeconds < next.nextTimelineSeconds - epsilon)
      ) {
        next = occurrence
      }
    }
    return next
  }

  private resetOccurrences(positionSeconds: number, resumeActive = true) {
    const performance = this.performance
    if (!performance) {
      this.occurrences = []
      return
    }

    const duration = performance.request.durationSeconds
    // Events variation has silenced stay in the performed layer but must not
    // be scheduled; they are rests, not notes.
    this.occurrences = [...soundingEvents(performance.performedEvents)]
      .sort(compareEvents)
      .flatMap((event) => {
        let nextTimelineSeconds = event.timeSeconds
        const occurrences: Array<EventOccurrence> = []
        const eventEnd = event.timeSeconds + event.durationSeconds
        if (
          resumeActive &&
          positionSeconds > event.timeSeconds + epsilon &&
          positionSeconds < eventEnd - epsilon
        ) {
          occurrences.push({
            event,
            nextTimelineSeconds: positionSeconds,
            resumeTimelineSeconds: positionSeconds,
          })
        }
        if (this.looping && nextTimelineSeconds < positionSeconds - epsilon) {
          nextTimelineSeconds +=
            Math.ceil((positionSeconds - nextTimelineSeconds) / duration) *
            duration
        } else if (!this.looping && nextTimelineSeconds < positionSeconds - epsilon) {
          nextTimelineSeconds = Number.POSITIVE_INFINITY
        }
        occurrences.push({ event, nextTimelineSeconds })
        return occurrences
      })
  }

  private addAutomationDiagnostics(
    diagnostics: ReadonlyArray<InstrumentAutomationDiagnostic>,
  ) {
    const held = new Set(
      this.automationDiagnosticsValue.map(
        (diagnostic) =>
          `${diagnostic.code}|${diagnostic.consumer}|${diagnostic.laneId}`,
      ),
    )
    for (const diagnostic of diagnostics) {
      const key = `${diagnostic.code}|${diagnostic.consumer}|${diagnostic.laneId}`
      if (held.has(key)) continue
      held.add(key)
      this.automationDiagnosticsValue.push(diagnostic)
    }
  }

  private timelineAt(audioTimeSeconds: number) {
    return (
      this.anchorTimelineSeconds +
      audioTimeSeconds -
      this.anchorAudioSeconds
    )
  }

  private normalizePosition(positionSeconds: number) {
    if (!Number.isFinite(positionSeconds)) {
      throw new RangeError('positionSeconds must be a finite number.')
    }
    const performance = this.performance
    if (!performance) return positionSeconds

    const start = performance.request.startSeconds
    const duration = performance.request.durationSeconds
    const end = start + duration
    if (!this.looping) return Math.min(end, Math.max(start, positionSeconds))

    const wrapped = ((positionSeconds - start) % duration + duration) % duration
    return start + wrapped
  }

  private assertUsable() {
    if (this.statusValue === 'disposed') {
      throw new Error('PerformanceScheduler has been disposed.')
    }
  }
}
