import { describe, expect, it } from 'vitest'

import type { InstrumentEngine } from '../audio/instrumentEngine'
import { PerformanceScheduler } from '../audio/performanceScheduler'
import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import type { BoundaryCrossingEncounter } from '../core/encounters'
import {
  compilePerformance,
  interpretEncounters,
  type CanonicalPerformance,
  type NoteMusicalEvent,
} from '../core/performance'
import { beatsToSeconds } from '../core/transport'
import {
  renderPerformanceToWav,
  type OfflineContextFactory,
  type OfflineRenderContext,
} from './audioRender'
import { buildPerformanceMidiTracks } from './midiExport'
import { buildPerformancePatternParts } from './strudelExport'

/**
 * The smallest context the render path will accept. It counts nothing and
 * renders silence; the assertions below are about which events were handed to
 * an engine, which `renderedEventCount` reports directly.
 */
const silentOfflineContext: OfflineContextFactory = (
  channelCount,
  frameCount,
  sampleRateHz,
) => {
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  })
  const node = () => ({
    connect: () => undefined,
    disconnect: () => undefined,
    frequency: param(),
    Q: param(),
    gain: param(),
    pan: param(),
    type: '',
    buffer: null,
    start: () => undefined,
    stop: () => undefined,
  })
  return {
    sampleRate: sampleRateHz,
    currentTime: 0,
    state: 'suspended',
    destination: node(),
    createGain: node,
    createOscillator: node,
    createStereoPanner: node,
    createBufferSource: node,
    createBiquadFilter: node,
    createBuffer: (_channels: number, length: number) => ({
      numberOfChannels: 1,
      length,
      sampleRate: sampleRateHz,
      getChannelData: () => new Float32Array(length),
    }),
    resume: async () => undefined,
    startRendering: async () => ({
      numberOfChannels: channelCount,
      length: frameCount,
      sampleRate: sampleRateHz,
      getChannelData: () => new Float32Array(frameCount),
    }),
  } as unknown as OfflineRenderContext
}

describe('canonical export agreement', () => {
  it('MIDI and Strudel adapt every performed event exactly once', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const performance = compilePerformance(composition, {
      startSeconds: 0,
      durationSeconds: beatsToSeconds(
        composition.transport.loop.lengthBeats,
        composition.transport.tempoBpm,
      ),
      sampleRateHz: 120,
    })
    const midiCount = buildPerformanceMidiTracks(performance, composition)
      .reduce((count, track) => count + track.notes.length, 0)
    const strudelCount = buildPerformancePatternParts(performance, composition)
      .flatMap((part) => part.tokens)
      .filter((token) => token !== '~').length

    expect(midiCount).toBe(performance.performedEvents.length)
    expect(strudelCount).toBe(performance.performedEvents.length)
  })

  it('keeps a paired region exit as the note-off in every consumer', async () => {
    const composition = structuredClone(defaultComposition) as Composition
    const part = composition.parts[0]
    if (part.kind !== 'note') throw new Error('Expected the default note Part.')
    part.duration = { kind: 'inside-region' }
    part.quantize = undefined
    part.encounterQuery.fieldIds = ['field-wedge']
    part.encounterQuery.boundaryIds = ['wedge-1']
    const request = { startSeconds: 0, durationSeconds: 2, sampleRateHz: 120 }
    const encounter = (
      transition: 'enter' | 'exit',
      timeSeconds: number,
      absoluteBeat: number,
    ): BoundaryCrossingEncounter =>
      Object.freeze({
        id: `gate-${transition}`,
        kind: 'boundary-crossing',
        timeSeconds,
        subjectIds: Object.freeze(['wheel-1', 'head-1'] as const),
        wheelId: 'wheel-1',
        headId: 'head-1',
        fieldId: 'field-wedge',
        boundaryId: 'wedge-1',
        boundaryIndex: 0,
        boundaryKind: 'spoke',
        transition,
        position: Object.freeze({ x: 100, y: transition === 'enter' ? -20 : 20 }),
        direction: 'counterclockwise',
        strength: 1,
        speed: 20,
        incidenceAngle: 0,
        wheelPhase: timeSeconds,
        absoluteBeat,
        barIndex: 0,
        beatInBar: absoluteBeat,
        barPhase: absoluteBeat / 4,
      })
    const encounters = Object.freeze([
      encounter('enter', 0.5, 1),
      encounter('exit', 1.5, 3),
    ])
    const interpretation = interpretEncounters(composition, request, encounters)
    expect(interpretation.diagnostics).toEqual([])
    expect(interpretation.events).toHaveLength(1)
    const event = interpretation.events[0]
    expect(event.timeSeconds + event.durationSeconds).toBe(1.5)

    const performance: CanonicalPerformance = Object.freeze({
      compositionId: composition.id,
      request: Object.freeze(request),
      encounters,
      relationEncounters: Object.freeze([]),
      traceEncounters: Object.freeze([]),
      controlLanes: Object.freeze([]),
      interpretedEvents: interpretation.events,
      performedEvents: interpretation.events,
      variationTrace: interpretation.variationTrace,
      diagnostics: interpretation.diagnostics,
    })

    const midiNote = buildPerformanceMidiTracks(performance, composition)[0].notes[0]
    expect(midiNote.tick + midiNote.duration).toBe(3 * 480)
    expect(buildPerformancePatternParts(performance, composition)[0].clip).toBe(8)

    const scheduled: Array<{ event: NoteMusicalEvent; at: number }> = []
    const engine: InstrumentEngine = {
      currentTimeSeconds: 0,
      resume: async () => undefined,
      suspend: async () => undefined,
      schedule: (scheduledEvent, _instrument, at) => {
        scheduled.push({ event: scheduledEvent, at })
      },
      cancelScheduledFrom: () => undefined,
      panic: () => undefined,
      dispose: async () => undefined,
    }
    const scheduler = new PerformanceScheduler(engine, {
      clock: { setInterval: () => 1, clearInterval: () => undefined },
      lookaheadSeconds: 10,
      tickMilliseconds: 25,
      startDelaySeconds: 0,
    })
    await scheduler.start(performance, composition.instruments, {
      tempoBpm: composition.transport.tempoBpm,
    })
    expect(scheduled).toMatchObject([
      { event: { durationSeconds: 1 }, at: 0.5 },
    ])
    await scheduler.dispose()

    const offline = await renderPerformanceToWav({
      composition,
      performance,
      sampleRateHz: 8_000,
      tailSeconds: 0,
      contextFactory: silentOfflineContext,
    })
    expect(offline.renderedEventCount).toBe(1)
  })
})

/**
 * Interpretation variation can silence a note while keeping it in the performed
 * layer, so it holds its interpreted id and the variation trace can explain the
 * difference. Every consumer that turns events into sound or notation has to
 * honour that flag.
 *
 * These live together rather than in each consumer's own file because the
 * defect they guard against was precisely that each consumer forgot
 * independently: `rest` was written by the compiler and read by nobody, so a
 * silenced note still sounded in playback, MIDI, Strudel, and the offline
 * render alike.
 */
describe('a silenced event is a rest in every consumer', () => {
  const silencedComposition = () => {
    const composition = structuredClone(defaultComposition) as Composition
    composition.variation = {
      enabled: true,
      // This seed drops 9 of 26 events, so the assertions below are not
      // vacuously true on a layer that happens to have no rests.
      seed: 'a',
      interpretation: { enabled: true, amount: 1 },
    }
    return composition
  }

  const silencedPerformance = () => {
    const composition = silencedComposition()
    const performance = compilePerformance(composition, {
      startSeconds: 0,
      durationSeconds: 4,
      sampleRateHz: 120,
    })
    const rests = performance.performedEvents.filter((event) => event.rest)
    const sounding = performance.performedEvents.filter((event) => !event.rest)
    expect(rests.length).toBeGreaterThan(0)
    expect(sounding.length).toBeGreaterThan(0)
    return { composition, performance, rests, sounding }
  }

  it('keeps rests in the performed layer with their interpreted identity', () => {
    const { performance, rests } = silencedPerformance()
    // A rest is silenced, not deleted: its id still matches the interpreted
    // event it came from, which is what lets the trace explain the change.
    const interpretedIds = new Set(
      performance.interpretedEvents.map((event) => event.id),
    )
    for (const rest of rests) expect(interpretedIds.has(rest.id)).toBe(true)
  })

  it('omits rests from MIDI', () => {
    const { composition, performance, sounding } = silencedPerformance()
    const tracks = buildPerformanceMidiTracks(performance, composition)
    const midiCount = tracks.reduce(
      (count, track) => count + track.notes.length,
      0,
    )
    expect(midiCount).toBe(sounding.length)
    expect(midiCount).toBeLessThan(performance.performedEvents.length)
  })

  it('writes rests as rest tokens in Strudel', () => {
    const { composition, performance, sounding } = silencedPerformance()
    const parts = buildPerformancePatternParts(performance, composition)
    const soundingTokens = parts
      .flatMap((part) => part.tokens)
      .filter((token) => token !== '~')

    // Strudel quantizes to a grid, so several events can share a slot; the
    // claim is that no rest ever produces a sounding token.
    expect(soundingTokens.length).toBeLessThanOrEqual(sounding.length)
    expect(soundingTokens.length).toBeGreaterThan(0)
  })

  it('does not schedule rests for live playback', async () => {
    const { composition, performance, sounding } = silencedPerformance()
    const scheduled: Array<NoteMusicalEvent> = []
    const engine: InstrumentEngine = {
      currentTimeSeconds: 0,
      resume: async () => undefined,
      suspend: async () => undefined,
      schedule: (event) => {
        scheduled.push(event)
      },
      cancelScheduledFrom: () => undefined,
      panic: () => undefined,
      dispose: async () => undefined,
    }
    const scheduler = new PerformanceScheduler(engine, {
      clock: { setInterval: () => 1, clearInterval: () => undefined },
      lookaheadSeconds: 10,
      tickMilliseconds: 25,
      startDelaySeconds: 0,
    })

    await scheduler.start(performance, composition.instruments, {
      tempoBpm: composition.transport.tempoBpm,
    })

    expect(scheduled.length).toBe(sounding.length)
    expect(scheduled.every((event) => !event.rest)).toBe(true)
    await scheduler.dispose()
  })

  it('does not render rests offline', async () => {
    const { composition, performance, sounding } = silencedPerformance()
    const result = await renderPerformanceToWav({
      composition,
      performance,
      sampleRateHz: 8000,
      tailSeconds: 0,
      contextFactory: silentOfflineContext,
    })

    expect(result.renderedEventCount).toBe(sounding.length)
    expect(result.renderedEventCount).toBeLessThan(
      performance.performedEvents.length,
    )
  })
})
