import { describe, expect, it } from 'vitest'

// Read as text so the invariant is checked against the real import list.
import replaySource from './replay.ts?raw'

import type { Composition, NotePartSpec } from './composition'
import { defaultComposition } from './defaultComposition'
import { compilePerformance } from './performance'
import {
  createRecording,
  engineVersion,
  provenanceWarnings,
  recordingVersion,
} from './recording'
import { randomVersion } from './random'
import { reinterpretRecording, replayRecording } from './replay'
import {
  exportRecordingToJson,
  parseRecordingJson,
} from '../export/recordingJson'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

const notePart = (id: string, root: number): NotePartSpec => ({
  id,
  name: id,
  enabled: true,
  mute: false,
  solo: false,
  kind: 'note',
  encounterQuery: {
    kinds: ['boundary-crossing'],
    wheelIds: [],
    headIds: [],
    fieldIds: [],
    boundaryIds: [],
    directions: [],
    minStrength: 0,
  },
  instrumentId: 'instrument-1',
  onset: { kind: 'encounter-time' },
  pitch: { kind: 'boundary-degree', root, scale: 'major', octaves: 2 },
  velocity: { kind: 'encounter-strength', min: 40, max: 120, gamma: 1 },
  duration: { kind: 'fixed', beats: 0.5 },
})

const source = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.parts = [notePart('part-a', 48)]
  return composition
}

const record = (composition: Composition) => {
  const performance = compilePerformance(composition, request)
  return createRecording({
    id: 'recording-1',
    name: 'Take 1',
    composition,
    performance,
  })
}

describe('MG-18 acceptance', () => {
  it('replays after the source Wheels and Fields are removed', () => {
    const composition = source()
    const recording = record(composition)
    expect(recording.performedEvents.length).toBeGreaterThan(0)

    // Strip the geometry that produced it. Replay must not care.
    const stripped = {
      ...recording,
      composition: { ...recording.composition, wheels: [], fields: [] },
    }
    const replayed = replayRecording(stripped)

    expect(replayed.events).toEqual(recording.performedEvents)
    expect(replayed.warnings).toEqual([])
  })

  it('reinterprets without disturbing Encounter identity or measurements', () => {
    const recording = record(source())
    const original = reinterpretRecording(recording, [notePart('part-a', 48)])
    const rescored = reinterpretRecording(recording, [notePart('part-b', 60)])

    // The music changed.
    expect(rescored.events.map((event) => event.midiNote)).not.toEqual(
      original.events.map((event) => event.midiNote),
    )
    expect(rescored.events.every((event) => event.partId === 'part-b')).toBe(true)

    // The physical facts did not.
    expect(recording.encounters.map((item) => item.id)).toEqual(
      record(source()).encounters.map((item) => item.id),
    )
    for (const event of rescored.events) {
      const encounter = recording.encounters.find(
        (item) => item.id === event.sourceEncounterId,
      )
      expect(encounter).toBeDefined()
    }
  })

  it('round-trips deterministically through JSON', () => {
    const recording = record(source())
    const json = exportRecordingToJson(recording)
    const parsed = parseRecordingJson(json)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(exportRecordingToJson(parsed.recording)).toBe(json)
    expect(parsed.recording.performedEvents).toEqual(recording.performedEvents)
    expect(parsed.recording.encounters).toEqual(recording.encounters)

    // Replay from the parsed copy matches replay from the original.
    expect(replayRecording(parsed.recording).events).toEqual(
      replayRecording(recording).events,
    )
  })

  it('replays a seeded performance rather than rerolling its variation', () => {
    const composition = source()
    composition.variation = {
      enabled: true,
      seed: 'alpha',
      version: randomVersion,
      performance: { enabled: true, amount: 1 },
    }
    const recording = record(composition)

    // Change the seed on the snapshot the Recording carries. Replay is the
    // captured layer, so it must be unaffected.
    const reseeded = {
      ...recording,
      composition: {
        ...recording.composition,
        variation: { ...composition.variation, seed: 'beta' },
      },
    }

    expect(replayRecording(reseeded).events).toEqual(recording.performedEvents)
    // Recompiling under the new seed genuinely differs, which is the contrast.
    expect(
      compilePerformance(
        { ...composition, variation: { ...composition.variation, seed: 'beta' } },
        request,
      ).performedEvents,
    ).not.toEqual(recording.performedEvents)
  })

  it('reports truncation instead of losing events silently', () => {
    const composition = source()
    const performance = compilePerformance(composition, request)
    expect(performance.encounters.length).toBeGreaterThan(2)

    const capped = createRecording({
      id: 'recording-capped',
      name: 'Capped',
      composition,
      performance,
      limits: { maxEncounters: 2, maxEvents: 1 },
    })

    expect(capped.encounters).toHaveLength(2)
    expect(capped.performedEvents).toHaveLength(1)
    expect(capped.truncations.map((item) => item.layer)).toContain('encounters')
    for (const truncation of capped.truncations) {
      expect(truncation.dropped).toBeGreaterThan(0)
      expect(truncation.message).toMatch(/incomplete/)
    }
    // The warning travels with any replay of that Recording.
    expect(replayRecording(capped).warnings.join(' ')).toMatch(/incomplete/)
  })

  it('records only the requested Transport window', () => {
    const composition = source()
    const performance = compilePerformance(composition, request)
    const windowed = createRecording({
      id: 'recording-window',
      name: 'Second half',
      composition,
      performance,
      window: { startSeconds: 2, endSeconds: 4 },
    })

    expect(windowed.encounters.length).toBeGreaterThan(0)
    expect(windowed.encounters.length).toBeLessThan(performance.encounters.length)
    for (const encounter of windowed.encounters) {
      expect(encounter.timeSeconds).toBeGreaterThanOrEqual(2 - 1e-9)
      expect(encounter.timeSeconds).toBeLessThanOrEqual(4 + 1e-9)
    }
    expect(() =>
      createRecording({
        id: 'bad',
        name: 'bad',
        composition,
        performance,
        window: { startSeconds: 3, endSeconds: 1 },
      }),
    ).toThrow(/end before it starts/)
  })

  it('warns when provenance differs from this engine', () => {
    const recording = record(source())
    expect(provenanceWarnings(recording)).toEqual([])

    const older = {
      ...recording,
      provenance: {
        ...recording.provenance,
        engineVersion: engineVersion + 1,
        randomVersion: randomVersion + 1,
      },
    }
    const warnings = provenanceWarnings(older)
    expect(warnings.map((item) => item.code)).toEqual([
      'engine-version',
      'random-version',
    ])
    // Replay still works; it just says what it is.
    expect(replayRecording(older).events).toEqual(recording.performedEvents)
    expect(replayRecording(older).warnings.length).toBe(2)
  })

  it('refuses a Recording newer than this engine rather than half-reading it', () => {
    const recording = record(source())
    const future = exportRecordingToJson({
      ...recording,
      provenance: { ...recording.provenance, recordingVersion: recordingVersion + 1 },
    })
    const parsed = parseRecordingJson(future)

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.issues.join(' ')).toMatch(/newer than/)

    expect(parseRecordingJson('{ not json').ok).toBe(false)
    expect(parseRecordingJson('{}').ok).toBe(false)
  })
})

describe('replay stays independent of geometry', () => {
  it('imports no Wheel, Head, Field, Trace, or Encounter engine module', () => {
    const source = replaySource
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(
      (match) => match[1],
    )

    // Encounters are read from the Recording as data; evaluating geometry is
    // what a Recording exists to avoid.
    const forbidden = [
      './wheels',
      './heads',
      './fields',
      './motion',
      './crossings',
      './encounters',
      './traces',
      './traceEncounters',
      './relations',
    ]
    for (const specifier of imports) {
      expect(forbidden).not.toContain(specifier)
    }
    // Type-only Encounter references are fine; a value import is not.
    expect(source).not.toMatch(/^import \{[^}]*compileBoundaryEncounters/m)
  })
})
