import { describe, expect, it } from 'vitest'

import type { InstrumentSpec } from '../core/composition'
import type {
  CanonicalPerformance,
  NoteMusicalEvent,
} from '../core/performance'
import type { InstrumentEngine } from './instrumentEngine'
import {
  PerformanceScheduler,
  type SchedulerClock,
} from './performanceScheduler'

const synth = (
  id: string,
  waveform: 'sine' | 'triangle' | 'square' | 'sawtooth' = 'triangle',
): InstrumentSpec => ({
  id,
  name: id,
  kind: 'native-synth',
  gain: 0.8,
  pan: 0,
  waveform,
  envelope: {
    attackSeconds: 0.01,
    decaySeconds: 0.1,
    sustain: 0.7,
    releaseSeconds: 0.2,
  },
})

const note = (
  id: string,
  timeSeconds: number,
  partId = 'part-a',
  instrumentId = 'synth-a',
): NoteMusicalEvent =>
  Object.freeze({
    id,
    sourceEncounterId: `encounter-${id}`,
    partId,
    instrumentId,
    kind: 'note',
    timeSeconds,
    absoluteBeat: timeSeconds * 2,
    barIndex: 0,
    beatInBar: timeSeconds * 2,
    barPhase: timeSeconds / 2,
    midiNote: 60,
    frequencyHz: 261.625565,
    velocity: 96,
    durationBeats: 0.5,
    durationSeconds: 0.25,
    rest: false,
    probability: 1,
  })

const performance = (
  events: ReadonlyArray<NoteMusicalEvent>,
  durationSeconds = 1,
  compositionId = 'composition-a',
): CanonicalPerformance =>
  Object.freeze({
    compositionId,
    request: Object.freeze({
      startSeconds: 0,
      durationSeconds,
      sampleRateHz: 120,
    }),
    encounters: Object.freeze([]),
    relationEncounters: Object.freeze([]),
    controlLanes: Object.freeze([]),
    interpretedEvents: events,
    performedEvents: events,
    diagnostics: Object.freeze([]),
  })

class FakeClock implements SchedulerClock {
  private nextId = 1
  readonly callbacks = new Map<number, () => void>()

  setInterval(callback: () => void) {
    const id = this.nextId
    this.nextId += 1
    this.callbacks.set(id, callback)
    return id
  }

  clearInterval(handle: unknown) {
    this.callbacks.delete(handle as number)
  }

  tick() {
    for (const callback of [...this.callbacks.values()]) callback()
  }
}

class FakeEngine implements InstrumentEngine {
  currentTimeSeconds = 0
  readonly scheduled: Array<{
    event: NoteMusicalEvent
    instrument: InstrumentSpec
    audioTimeSeconds: number
    calledAtSeconds: number
  }> = []
  readonly cancellations: Array<number> = []
  readonly panics: Array<number> = []
  resumeCount = 0
  suspendCount = 0
  disposeCount = 0

  async resume() {
    this.resumeCount += 1
  }

  async suspend() {
    this.suspendCount += 1
  }

  schedule(
    event: NoteMusicalEvent,
    instrument: InstrumentSpec,
    audioTimeSeconds: number,
  ) {
    this.scheduled.push({
      event,
      instrument,
      audioTimeSeconds,
      calledAtSeconds: this.currentTimeSeconds,
    })
  }

  cancelScheduledFrom(audioTimeSeconds: number) {
    this.cancellations.push(audioTimeSeconds)
  }

  panic(audioTimeSeconds: number) {
    this.panics.push(audioTimeSeconds)
  }

  async dispose() {
    this.disposeCount += 1
  }
}

const schedulerFor = (
  engine: FakeEngine,
  clock: FakeClock,
  overrides: ConstructorParameters<typeof PerformanceScheduler>[1] = {},
) =>
  new PerformanceScheduler(engine, {
    clock,
    lookaheadSeconds: 1,
    tickMilliseconds: 25,
    startDelaySeconds: 0.1,
    ...overrides,
  })

describe('PerformanceScheduler', () => {
  it('submits canonical event objects in stable order with their own Instruments', async () => {
    const engine = new FakeEngine()
    const clock = new FakeClock()
    const scheduler = schedulerFor(engine, clock)
    const instruments = [synth('synth-a', 'sine'), synth('synth-b', 'square')]
    const events = [
      note('late', 0.6),
      note('same-b', 0.2, 'part-b', 'synth-b'),
      note('same-a', 0.2, 'part-a', 'synth-a'),
    ]

    await scheduler.start(performance(events), instruments, { tempoBpm: 120 })

    expect(engine.scheduled.map(({ event }) => event)).toEqual([
      events[2],
      events[1],
      events[0],
    ])
    expect(engine.scheduled.map(({ event }) => event.durationSeconds)).toEqual([
      0.25,
      0.25,
      0.25,
    ])
    expect(engine.scheduled.map(({ instrument }) => instrument)).toEqual([
      instruments[0],
      instruments[1],
      instruments[0],
    ])
    const requestedTimes = engine.scheduled.map(
      ({ audioTimeSeconds }) => audioTimeSeconds,
    )
    expect(requestedTimes[0]).toBeCloseTo(0.3)
    expect(requestedTimes[1]).toBeCloseTo(0.3)
    expect(requestedTimes[2]).toBeCloseTo(0.7)
  })

  it('keeps requested timestamps stable when timer callbacks arrive at different times', async () => {
    const runAt = async (calledAtSeconds: number) => {
      const engine = new FakeEngine()
      const clock = new FakeClock()
      const scheduler = schedulerFor(engine, clock, { lookaheadSeconds: 0.05 })
      await scheduler.start(performance([note('jitter', 0.2)]), [synth('synth-a')], {
        tempoBpm: 120,
      })
      engine.currentTimeSeconds = calledAtSeconds
      clock.tick()
      return engine.scheduled[0]
    }

    const early = await runAt(0.26)
    const late = await runAt(0.28)

    expect(early.calledAtSeconds).toBe(0.26)
    expect(late.calledAtSeconds).toBe(0.28)
    expect(early.audioTimeSeconds).toBeCloseTo(0.3)
    expect(late.audioTimeSeconds).toBeCloseTo(0.3)
  })

  it('cancels queued and active voices across pause, seek, stop, and dispose', async () => {
    const engine = new FakeEngine()
    const clock = new FakeClock()
    const scheduler = schedulerFor(engine, clock)
    await scheduler.start(performance([note('held', 0.8)]), [synth('synth-a')], {
      tempoBpm: 120,
    })

    engine.currentTimeSeconds = 0.2
    await scheduler.pause()
    expect(scheduler.status).toBe('paused')
    expect(engine.cancellations.at(-1)).toBe(0.2)
    expect(engine.panics.at(-1)).toBe(0.2)
    expect(engine.cancellations).toHaveLength(2)
    expect(engine.panics).toHaveLength(2)
    expect(clock.callbacks.size).toBe(0)

    await scheduler.resume()
    scheduler.seek(0.7)
    expect(engine.cancellations.at(-1)).toBe(0.2)
    expect(engine.panics.at(-1)).toBe(0.2)
    expect(engine.cancellations).toHaveLength(3)
    expect(engine.panics).toHaveLength(3)

    await scheduler.stop()
    expect(scheduler.status).toBe('stopped')
    expect(engine.cancellations).toHaveLength(4)
    expect(engine.panics).toHaveLength(4)
    expect(engine.suspendCount).toBe(2)

    await scheduler.dispose()
    expect(scheduler.status).toBe('disposed')
    expect(engine.disposeCount).toBe(1)
    expect(() => scheduler.seek(0)).toThrow('disposed')
  })

  it('schedules loop occurrences at exact request-duration intervals', async () => {
    const engine = new FakeEngine()
    const clock = new FakeClock()
    const scheduler = schedulerFor(engine, clock, { lookaheadSeconds: 1.2 })
    const event = note('looped', 0)
    await scheduler.start(performance([event]), [synth('synth-a')], {
      tempoBpm: 120,
      loop: true,
    })

    expect(engine.scheduled.map(({ event: submitted }) => submitted)).toEqual([
      event,
      event,
    ])
    expect(engine.scheduled.map(({ audioTimeSeconds }) => audioTimeSeconds)).toEqual([
      0.1,
      1.1,
    ])

    engine.currentTimeSeconds = 0.9
    clock.tick()
    expect(engine.scheduled.at(-1)?.audioTimeSeconds).toBeCloseTo(2.1)
  })

  it('hands a live edit over at the next Transport beat by default', async () => {
    const engine = new FakeEngine()
    const clock = new FakeClock()
    const scheduler = schedulerFor(engine, clock, { lookaheadSeconds: 0.2 })
    const oldPerformance = performance([note('old', 0.5)], 1, 'old')
    const replacement = note('new', 0.5, 'part-new', 'synth-b')

    await scheduler.start(oldPerformance, [synth('synth-a')], { tempoBpm: 120 })
    engine.currentTimeSeconds = 0.1
    scheduler.queuePerformance(
      performance([replacement], 1, 'new'),
      [synth('synth-b', 'square')],
    )
    expect(scheduler.pendingBoundarySeconds).toBe(0.5)

    engine.currentTimeSeconds = 0.4
    clock.tick()

    expect(scheduler.pendingBoundarySeconds).toBeNull()
    expect(engine.cancellations.at(-1)).toBeCloseTo(0.6)
    expect(engine.scheduled.at(-1)).toMatchObject({
      event: replacement,
      instrument: expect.objectContaining({ id: 'synth-b', waveform: 'square' }),
    })
    expect(engine.scheduled.at(-1)?.audioTimeSeconds).toBeCloseTo(0.6)
  })

  it('accepts an explicit future Transport beat for edit handoff', async () => {
    const engine = new FakeEngine()
    const clock = new FakeClock()
    const scheduler = schedulerFor(engine, clock, { lookaheadSeconds: 0.2 })
    const replacement = note('explicit', 1, 'part-new', 'synth-b')
    await scheduler.start(
      performance([note('old', 1)], 2, 'old'),
      [synth('synth-a')],
      { tempoBpm: 120 },
    )

    engine.currentTimeSeconds = 0.1
    scheduler.queuePerformance(
      performance([replacement], 2, 'new'),
      [synth('synth-b')],
      { kind: 'absolute-beat', absoluteBeat: 2 },
    )
    expect(scheduler.pendingBoundarySeconds).toBe(1)

    engine.currentTimeSeconds = 0.9
    clock.tick()
    expect(engine.cancellations.at(-1)).toBeCloseTo(1.1)
    expect(engine.scheduled.at(-1)?.event).toBe(replacement)
    expect(engine.scheduled.at(-1)?.audioTimeSeconds).toBeCloseTo(1.1)
  })

  it('rejects missing Instrument routing before playback begins', async () => {
    const scheduler = schedulerFor(new FakeEngine(), new FakeClock())

    await expect(
      scheduler.start(performance([note('orphan', 0.2)]), [], { tempoBpm: 120 }),
    ).rejects.toThrow('missing instrument synth-a')
  })
})
