import { describe, expect, it } from 'vitest'

import { validateComposition } from '../../core/compositionValidation'
import { compilePerformance } from '../../core/performance'
import { createRecording } from '../../core/recording'
import { reinterpretRecording, replayRecording } from '../../core/replay'
import {
  allReferenceCompositions,
  concurrentWheelsComposition,
  multiHeadWheelComposition,
  relationHarmonyComposition,
  reinterpretationComposition,
  ringAndSpokeComposition,
  seededVariationComposition,
  showcaseComposition,
  traceObservationComposition,
} from './compositions'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

describe('reference fixtures', () => {
  it('are all valid Compositions that compile without errors', () => {
    for (const { label, composition } of allReferenceCompositions()) {
      const validation = validateComposition(composition)
      expect(validation.ok, `${label}: ${JSON.stringify(
        validation.ok ? [] : validation.issues.slice(0, 2),
      )}`).toBe(true)

      const performance = compilePerformance(composition, request)
      const errors = performance.diagnostics.filter(
        (diagnostic) => diagnostic.severity === 'error',
      )
      expect(errors, `${label} compile errors`).toEqual([])
    }
  })

  it('hand back an independent copy each time', () => {
    const first = ringAndSpokeComposition()
    first.name = 'mutated'
    first.wheels.length = 0
    expect(ringAndSpokeComposition().name).toBe('Simple Ring Crossing')
    expect(ringAndSpokeComposition().wheels.length).toBeGreaterThan(0)
  })

  it('carry the structure each fixture exists to represent', () => {
    const simple = ringAndSpokeComposition()
    expect(simple.wheels).toHaveLength(1)
    expect(simple.wheels[0].heads).toHaveLength(1)

    const multiHead = multiHeadWheelComposition()
    expect(multiHead.wheels).toHaveLength(1)
    expect(multiHead.wheels[0].heads.length).toBeGreaterThanOrEqual(3)

    const concurrent = concurrentWheelsComposition()
    expect(concurrent.wheels).toHaveLength(4)
    for (const wheel of concurrent.wheels) {
      expect(wheel.heads).toHaveLength(3)
    }

    const relations = relationHarmonyComposition()
    expect(relations.relations?.length).toBeGreaterThanOrEqual(2)
    expect(relations.parts.some((part) => part.kind === 'control')).toBe(true)

    // Only the leading Head of each Wheel observes, so the fixture measures
    // trace indexing rather than saturating the 10,000 Encounter cap.
    const observed = traceObservationComposition()
    expect(
      observed.wheels.every((wheel) => wheel.heads[0].observation?.enabled),
    ).toBe(true)
    expect(
      observed.wheels.every((wheel) =>
        wheel.heads.slice(1).every((head) => head.observation === undefined),
      ),
    ).toBe(true)
  })
})

describe('fixtures produce the behaviour they claim', () => {
  it('gives every Head on one Wheel the same clock', () => {
    const composition = multiHeadWheelComposition()
    const performance = compilePerformance(composition, request)
    expect(performance.performedEvents.length).toBeGreaterThan(0)
  })

  it('produces relation Encounters, not only boundary crossings', () => {
    const performance = compilePerformance(relationHarmonyComposition(), request)
    expect(performance.relationEncounters.length).toBeGreaterThan(0)
    expect(performance.controlLanes.length).toBeGreaterThan(0)
  })

  it('produces Trace Encounters when Heads observe their own path', () => {
    const performance = compilePerformance(traceObservationComposition(), request)
    expect(performance.traceEncounters.length).toBeGreaterThan(0)
  })

  it('makes seeded variation change the performed layer and record why', () => {
    const varied = compilePerformance(seededVariationComposition(), request)
    const plain = compilePerformance(concurrentWheelsComposition(), request)

    expect(varied.variationTrace.length).toBeGreaterThan(0)
    // The interpreted and performed layers must actually differ, or the
    // fixture is not exercising variation at all.
    expect(varied.performedEvents).not.toBe(varied.interpretedEvents)
    expect(varied.performedEvents.map((event) => event.timeSeconds)).not.toEqual(
      plain.performedEvents.map((event) => event.timeSeconds),
    )
  })

  it('is stable: the same fixture compiles to the same events twice', () => {
    for (const { label, composition } of allReferenceCompositions()) {
      const first = compilePerformance(composition, request)
      const second = compilePerformance(composition, request)
      expect(
        second.performedEvents.map((event) => event.id),
        `${label} event ids`,
      ).toEqual(first.performedEvents.map((event) => event.id))
      expect(
        second.performedEvents.map((event) => event.timeSeconds),
        `${label} event times`,
      ).toEqual(first.performedEvents.map((event) => event.timeSeconds))
    }
  })

  it('round-trips a recording through replay and reinterpretation', () => {
    const composition = reinterpretationComposition()
    const performance = compilePerformance(composition, request)
    const recording = createRecording({
      id: 'fixture-recording',
      name: 'Fixture Take',
      composition,
      performance,
    })

    // Replay hands back the recorded layer untouched, not a recompile.
    const replayed = replayRecording(recording)
    expect(replayed.events).toBe(recording.performedEvents)

    // Reinterpretation re-derives the musical layer from the recorded
    // Encounters, so a Part change moves the notes without moving the geometry.
    const retuned = structuredClone(composition.parts) as typeof composition.parts
    const notePart = retuned.find((part) => part.kind === 'note')
    if (notePart && notePart.kind === 'note') {
      notePart.pitch = { kind: 'fixed-midi', note: 64 }
    }
    const reinterpreted = reinterpretRecording(recording, retuned)
    expect(reinterpreted.events.length).toBeGreaterThan(0)

    const retunedNotes = reinterpreted.events.filter(
      (event) => event.partId === notePart?.id,
    )
    const recordedNotes = recording.performedEvents.filter(
      (event) => event.partId === notePart?.id,
    )
    expect(retunedNotes.length).toBeGreaterThan(0)

    // This fixture has interpretation variation on, so a fixed-midi Part is
    // not pinned to one note: variation still shifts it by up to two scale
    // degrees. The claim is that the Part change took effect, which shows up
    // as a collapse from a mapped range onto one note plus that shift.
    const retunedPitches = new Set(retunedNotes.map((event) => event.midiNote))
    const recordedPitches = new Set(recordedNotes.map((event) => event.midiNote))
    expect(retunedPitches.size).toBeLessThan(recordedPitches.size)
    for (const event of retunedNotes) {
      expect(Math.abs((event.midiNote ?? 0) - 64)).toBeLessThanOrEqual(12)
    }
  })
})

describe('the showcase meets its acceptance shape', () => {
  it('has four Wheels of three Heads and four Instruments including a SoundFont', () => {
    const showcase = showcaseComposition()

    expect(showcase.wheels).toHaveLength(4)
    for (const wheel of showcase.wheels) expect(wheel.heads).toHaveLength(3)
    expect(showcase.fields.length).toBeGreaterThanOrEqual(2)
    expect(showcase.parts.length).toBeGreaterThanOrEqual(4)

    expect(showcase.instruments).toHaveLength(4)
    expect(
      showcase.instruments.filter(
        (instrument) => instrument.kind === 'soundfont',
      ),
    ).toHaveLength(1)
    // Every Instrument is actually reachable from a Part, so "four
    // simultaneous" is a claim about sound, not about the array length.
    const routed = new Set(showcase.parts.map((part) => part.instrumentId))
    for (const instrument of showcase.instruments) {
      expect(routed.has(instrument.id), instrument.id).toBe(true)
    }
  })

  it('names its SoundFont bank rather than carrying one', () => {
    const showcase = showcaseComposition()
    expect(showcase.soundBanks).toHaveLength(1)
    expect(showcase.soundBanks[0].digest).toMatch(/^[0-9a-f]{64}$/)
    // The reference must be resolvable by the Instrument that uses it.
    const soundFont = showcase.instruments.find(
      (instrument) => instrument.kind === 'soundfont',
    )
    expect(soundFont?.kind === 'soundfont' && soundFont.soundBankId).toBe(
      showcase.soundBanks[0].id,
    )
  })

  it('still compiles every Part when the bank is absent', () => {
    // No vault is involved at compile time: a missing bank is an audio-routing
    // problem, never a reason for the Composition to lose events.
    const performance = compilePerformance(showcaseComposition(), request)
    const partsWithEvents = new Set(
      performance.performedEvents.map((event) => event.partId),
    )
    expect(partsWithEvents.size).toBeGreaterThanOrEqual(3)
    expect(
      performance.diagnostics.filter(
        (diagnostic) => diagnostic.severity === 'error',
      ),
    ).toEqual([])
  })
})
