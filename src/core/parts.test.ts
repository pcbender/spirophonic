import { describe, expect, it } from 'vitest'

import type {
  EncounterQuery,
  NotePartSpec,
  SpaceSpec,
} from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
import {
  buildPartFigureSequence,
  encounterMatchesQuery,
  mapEncounterPitch,
  normalizeEncounterContour,
  relationMatchesQuery,
  selectPartEncounters,
  selectPartRelations,
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
  it('resolves a figure sequence over the Part Encounter stream', () => {
    const events = [encounter({ id: 'one' }), encounter({ id: 'two' })]
    const composition = {
      wheels: [{
        id: 'wheel-1',
        rate: { cycles: 1, beats: 4 },
        phase: 0,
        direction: 'forward',
      }],
    } as unknown as import('./composition').Composition
    const pitches = buildPartFigureSequence(
      part({
        pitch: {
          kind: 'figure-sequence',
          accessMode: 'fifo',
          endBehavior: 'loop',
          resetOn: 'performance',
          root: 60,
          scale: 'major',
          transform: { kind: 'prime', transpose: 0, axis: 60, intervalScale: 1 },
          figures: [{ kind: 'note', note: 60 }, { kind: 'chord', notes: [64, 67] }],
        },
      }),
      events,
      composition,
    )

    expect(pitches?.map((figure) => figure.map((pitch) => pitch.midiNote)))
      .toEqual([[60], [64, 67]])
  })

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

describe('MG-14 relation selection', () => {
  const relationEncounter = (
    overrides: Partial<Parameters<typeof relationMatchesQuery>[0]> = {},
  ) =>
    ({
      id: 'rel/1',
      kind: 'conjunction',
      relationId: 'relation-1',
      timeSeconds: 1,
      subjectIds: ['head-a', 'head-b'],
      wheelId: 'wheel-1',
      headId: 'head-a',
      partnerWheelId: 'wheel-2',
      partnerHeadId: 'head-b',
      position: { x: 0, y: 0 },
      direction: 'approaching',
      strength: 0.8,
      speed: 1,
      measurement: {
        timeSeconds: 1,
        headAId: 'head-a',
        headBId: 'head-b',
        distance: 10,
        angle: 0,
        approachRate: -1,
        rotationRate: 0,
        radiusDifference: 0,
        angularDifference: 0,
        speedDifference: 0,
        directionDifference: 0,
      },
      wheelPhase: 0,
      absoluteBeat: 2,
      barIndex: 0,
      beatInBar: 2,
      barPhase: 0.5,
      ...overrides,
    }) as Parameters<typeof relationMatchesQuery>[0]

  const relationQuery = (
    overrides: Partial<EncounterQuery> = {},
  ): EncounterQuery => ({
    kinds: ['conjunction'],
    wheelIds: [],
    headIds: [],
    fieldIds: [],
    boundaryIds: [],
    directions: [],
    minStrength: 0,
    ...overrides,
  })

  it('matches when either side of the pair qualifies', () => {
    const encounter = relationEncounter()

    // Filtering on the A side.
    expect(relationMatchesQuery(encounter, relationQuery({ headIds: ['head-a'] }))).toBe(
      true,
    )
    // Filtering on the B side selects the same relation.
    expect(relationMatchesQuery(encounter, relationQuery({ headIds: ['head-b'] }))).toBe(
      true,
    )
    // A Head that takes no part in the pair does not match.
    expect(relationMatchesQuery(encounter, relationQuery({ headIds: ['head-z'] }))).toBe(
      false,
    )
    // The same rule applies to Wheels.
    expect(
      relationMatchesQuery(encounter, relationQuery({ wheelIds: ['wheel-2'] })),
    ).toBe(true)
  })

  it('filters by relation id, kind, direction, and strength', () => {
    const encounter = relationEncounter()

    expect(
      relationMatchesQuery(encounter, relationQuery({ relationIds: ['relation-1'] })),
    ).toBe(true)
    expect(
      relationMatchesQuery(encounter, relationQuery({ relationIds: ['relation-9'] })),
    ).toBe(false)
    expect(
      relationMatchesQuery(encounter, relationQuery({ kinds: ['opposition'] })),
    ).toBe(false)
    expect(
      relationMatchesQuery(encounter, relationQuery({ directions: ['receding'] })),
    ).toBe(false)
    expect(relationMatchesQuery(encounter, relationQuery({ minStrength: 0.9 }))).toBe(
      false,
    )
  })

  it('selects nothing for a disabled Part', () => {
    const encounter = relationEncounter()
    const part = {
      id: 'part-1',
      name: 'Part',
      enabled: false,
      mute: false,
      solo: false,
      kind: 'note' as const,
      encounterQuery: relationQuery(),
      instrumentId: 'instrument-1',
      onset: { kind: 'encounter-time' as const },
      pitch: { kind: 'fixed-midi' as const, note: 60 },
      velocity: { kind: 'constant' as const, value: 90 },
      duration: { kind: 'fixed' as const, beats: 1 },
    }

    expect(selectPartRelations(part, [encounter])).toEqual([])
  })
})
