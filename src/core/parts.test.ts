import { describe, expect, it } from 'vitest'

import type {
  EncounterQuery,
  NotePartSpec,
  SpaceSpec,
} from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
import {
  encounterMatchesQuery,
  mapEncounterPitch,
  normalizeEncounterContour,
  selectPartEncounters,
  validatePartMusicalRange,
} from './parts'

const query = (overrides: Partial<EncounterQuery> = {}): EncounterQuery => ({
  kinds: ['boundary-crossing'],
  wheelIds: [],
  headIds: [],
  fieldIds: [],
  boundaryIds: [],
  directions: [],
  minStrength: 0,
  ...overrides,
})

const encounter = (
  overrides: Partial<BoundaryCrossingEncounter> = {},
): BoundaryCrossingEncounter => ({
  id: 'encounter-1',
  kind: 'boundary-crossing',
  timeSeconds: 1,
  subjectIds: ['wheel-1', 'head-1'],
  wheelId: 'wheel-1',
  headId: 'head-1',
  fieldId: 'field-1',
  boundaryId: 'boundary-1',
  boundaryIndex: 2,
  boundaryKind: 'ring',
  position: { x: 10, y: 0 },
  direction: 'outward',
  strength: 0.75,
  speed: 4,
  incidenceAngle: 0,
  wheelPhase: 0.5,
  absoluteBeat: 2,
  barIndex: 0,
  beatInBar: 2,
  barPhase: 0.5,
  ...overrides,
})

const part = (overrides: Partial<NotePartSpec> = {}): NotePartSpec => ({
  id: 'part-1',
  name: 'Part 1',
  enabled: true,
  mute: false,
  solo: false,
  kind: 'note',
  encounterQuery: query(),
  instrumentId: 'instrument-1',
  onset: { kind: 'encounter-time' },
  pitch: { kind: 'fixed-midi', note: 60 },
  velocity: { kind: 'constant', value: 90 },
  duration: { kind: 'fixed', beats: 1 },
  ...overrides,
})

const space: SpaceSpec = { center: { x: 0, y: 0 }, scale: 10 }

describe('Part Encounter queries', () => {
  it('filters by every physical selector and strength threshold', () => {
    const event = encounter()

    expect(
      encounterMatchesQuery(
        event,
        query({
          wheelIds: ['wheel-1'],
          headIds: ['head-1'],
          fieldIds: ['field-1'],
          boundaryIds: ['boundary-1'],
          directions: ['outward'],
          minStrength: 0.75,
        }),
      ),
    ).toBe(true)
    expect(
      encounterMatchesQuery(event, query({ headIds: ['head-2'] })),
    ).toBe(false)
    expect(
      encounterMatchesQuery(event, query({ kinds: ['trace-crossing'] })),
    ).toBe(false)
    expect(
      encounterMatchesQuery(event, query({ wheelIds: ['wheel-2'] })),
    ).toBe(false)
    expect(
      encounterMatchesQuery(event, query({ fieldIds: ['field-2'] })),
    ).toBe(false)
    expect(
      encounterMatchesQuery(event, query({ boundaryIds: ['boundary-2'] })),
    ).toBe(false)
    expect(
      encounterMatchesQuery(event, query({ directions: ['inward'] })),
    ).toBe(false)
    expect(
      encounterMatchesQuery(event, query({ minStrength: 0.751 })),
    ).toBe(false)
  })

  it('treats empty selector arrays as wildcards and ignores disabled Parts', () => {
    const events = [encounter(), encounter({ id: 'encounter-2' })]

    expect(selectPartEncounters(part(), events)).toEqual(events)
    expect(selectPartEncounters(part({ enabled: false }), events)).toEqual([])
  })
})

describe('Part pitch mappings', () => {
  it('maps fixed MIDI, exact frequency, and stable Boundary degree pitches', () => {
    expect(
      mapEncounterPitch(
        encounter(),
        { kind: 'fixed-midi', note: 60 },
        space,
      ),
    ).toMatchObject({ midiNote: 60 })
    expect(
      mapEncounterPitch(
        encounter(),
        { kind: 'fixed-frequency', frequencyHz: 432 },
        space,
      ),
    ).toEqual({ frequencyHz: 432 })
    expect(
      mapEncounterPitch(
        encounter({ boundaryIndex: 2 }),
        { kind: 'boundary-degree', root: 60, scale: 'major', octaves: 1 },
        space,
      ),
    ).toMatchObject({ midiNote: 64 })
  })

  it('maps spatial and contour measurements over a scale', () => {
    const events = [
      encounter({ id: 'left', position: { x: -10, y: 0 } }),
      encounter({ id: 'middle', position: { x: 0, y: 0 } }),
      encounter({ id: 'right', position: { x: 10, y: 0 } }),
    ]
    const contour = normalizeEncounterContour(events, 'x', space)

    expect(contour).toEqual([0, 0.5, 1])
    expect(
      mapEncounterPitch(
        events[1],
        { kind: 'contour', source: 'x', root: 60, scale: 'major', octaves: 1 },
        space,
        contour[1],
      ),
    ).toMatchObject({ midiNote: 65 })
    expect(
      mapEncounterPitch(
        events[2],
        { kind: 'spatial', source: 'x', root: 60, scale: 'major', octaves: 1 },
        space,
      ).midiNote,
    ).toBeGreaterThan(60)
  })

  it('supplies the simple Boundary-ordinal ratio mapping', () => {
    expect(
      mapEncounterPitch(
        encounter({ boundaryIndex: 2 }),
        { kind: 'ratio', rootFrequencyHz: 220, octaveFold: false },
        space,
      ),
    ).toMatchObject({ frequencyHz: 660 })
    expect(
      mapEncounterPitch(
        encounter({ boundaryIndex: 2 }),
        { kind: 'ratio', rootFrequencyHz: 220, octaveFold: true },
        space,
      ),
    ).toMatchObject({ frequencyHz: 330 })
  })

  it('reports scale configurations that exceed the MIDI range', () => {
    expect(
      validatePartMusicalRange(
        part({
          pitch: {
            kind: 'boundary-degree',
            root: 120,
            scale: 'major',
            octaves: 1,
          },
        }),
        '$.parts[0]',
      ),
    ).toMatchObject([
      { path: '$.parts[0].pitch.octaves', message: expect.stringContaining('127') },
    ])
  })
})
