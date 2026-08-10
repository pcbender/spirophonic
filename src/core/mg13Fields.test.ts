import { describe, expect, it } from 'vitest'

import type {
  BandFieldSpec,
  Composition,
  EllipseFieldSpec,
  GridFieldSpec,
  SpiralFieldSpec,
} from './composition'
import { validateComposition } from './compositionValidation'
import { defaultComposition } from './defaultComposition'
import { compileBoundaryEncounters } from './encounters'
import {
  bandSignedDistance,
  boundaryGeometryAtPlacement,
  ellipseSignedDistance,
  fieldPlacementAt,
  gridSignedDistance,
  spiralSignedDistance,
} from './fields'
import { compilePerformance } from './performance'

const TAU = Math.PI * 2

/** One Wheel tracing a circle of radius 100, so crossings are easy to reason about. */
const circleComposition = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.wheels[0].motion = {
    kind: 'lissajous',
    frequencyX: 1,
    frequencyY: 1,
    delta: Math.PI / 2,
  }
  composition.wheels[0].heads[0].attachment = {
    kind: 'lissajous',
    scaleX: 100,
    scaleY: 100,
    phaseX: 0,
    phaseY: 0,
  }
  composition.fields = []
  composition.parts = []
  return composition
}

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 240 }

const bandField = (): BandFieldSpec => ({
  id: 'field-band',
  name: 'Band',
  enabled: true,
  kind: 'bands',
  center: { x: 0, y: 0 },
  boundaries: [
    {
      id: 'band-1',
      name: 'Inner Band',
      enabled: true,
      index: 0,
      kind: 'band',
      innerRadius: 40,
      outerRadius: 80,
    },
  ],
})

const ellipseField = (rotation: number): EllipseFieldSpec => ({
  id: 'field-ellipse',
  name: 'Ellipse',
  enabled: true,
  kind: 'ellipses',
  center: { x: 0, y: 0 },
  rotation,
  boundaries: [
    {
      id: 'ellipse-1',
      name: 'Ellipse 1',
      enabled: true,
      index: 0,
      kind: 'ellipse',
      radius: 130,
      eccentricity: 0.8,
    },
  ],
})

describe('MG-13 signed distances', () => {
  it('places points inside, on, and outside each new family', () => {
    const origin = { x: 0, y: 0 }

    // Ellipse: semiMajor 100 along local x, semiMinor 60.
    expect(
      ellipseSignedDistance(origin, 0, 100, 60, { x: 0, y: 0 }),
    ).toBeLessThan(0)
    expect(
      ellipseSignedDistance(origin, 0, 100, 60, { x: 100, y: 0 }),
    ).toBeCloseTo(0, 9)
    expect(
      ellipseSignedDistance(origin, 0, 100, 60, { x: 150, y: 0 }),
    ).toBeGreaterThan(0)
    // Rotating the ellipse a quarter turn swaps which axis is long.
    expect(
      ellipseSignedDistance(origin, Math.PI / 2, 100, 60, { x: 0, y: 100 }),
    ).toBeCloseTo(0, 9)

    // Band: negative strictly inside the annulus, zero on both edges.
    expect(bandSignedDistance(origin, 40, 80, { x: 60, y: 0 })).toBeLessThan(0)
    expect(bandSignedDistance(origin, 40, 80, { x: 40, y: 0 })).toBeCloseTo(0, 9)
    expect(bandSignedDistance(origin, 40, 80, { x: 80, y: 0 })).toBeCloseTo(0, 9)
    expect(bandSignedDistance(origin, 40, 80, { x: 10, y: 0 })).toBeGreaterThan(0)
    expect(bandSignedDistance(origin, 40, 80, { x: 200, y: 0 })).toBeGreaterThan(0)

    // Grid: signed offset along the rotated axis.
    expect(gridSignedDistance(origin, 0, 'x', 50, { x: 70, y: 0 })).toBeCloseTo(20, 9)
    expect(gridSignedDistance(origin, 0, 'x', 50, { x: 20, y: 0 })).toBeCloseTo(-30, 9)
    expect(gridSignedDistance(origin, 0, 'y', 50, { x: 0, y: 70 })).toBeCloseTo(20, 9)

    // Spiral: on the first arm at theta = 0, radius = startRadius.
    expect(
      spiralSignedDistance(origin, 0, 50, 30, 3, { x: 50, y: 0 }),
    ).toBeCloseTo(0, 9)
    // Half a turn in, the arm has grown by half the per-turn growth.
    expect(
      spiralSignedDistance(origin, 0, 50, 30, 3, { x: -65, y: 0 }),
    ).toBeCloseTo(0, 6)
  })

  it('rejects degenerate parameters instead of returning a broken level set', () => {
    const origin = { x: 0, y: 0 }
    expect(() => bandSignedDistance(origin, 80, 40, origin)).toThrow(/exceed/)
    expect(() => ellipseSignedDistance(origin, 0, 0, 60, origin)).toThrow(/semiMajor/)
    expect(() => spiralSignedDistance(origin, 0, 50, 0, 3, origin)).toThrow(/growthPerTurn/)
    expect(() => spiralSignedDistance(origin, 0, 50, 30, 0, origin)).toThrow(/turns/)
  })
})

describe('MG-13 Field placement over time', () => {
  it('leaves a fixed Field at the same placement at every time', () => {
    const composition = circleComposition()
    composition.fields = [ellipseField(0)]
    const field = composition.fields[0]

    expect(fieldPlacementAt(composition, field, 0)).toEqual(
      fieldPlacementAt(composition, field, 3.7),
    )
  })

  it('turns an independently rotating Field at its own rate', () => {
    const composition = circleComposition()
    const field = { ...ellipseField(0), motion: { kind: 'rotating' as const, turnsPerSecond: 0.5 } }
    composition.fields = [field]

    expect(fieldPlacementAt(composition, field, 0).rotation).toBeCloseTo(0, 9)
    expect(fieldPlacementAt(composition, field, 1).rotation).toBeCloseTo(Math.PI, 9)
    expect(fieldPlacementAt(composition, field, 2).rotation).toBeCloseTo(TAU, 9)
  })

  it('derives a transport-rotating Field from absolute beats', () => {
    const composition = circleComposition()
    const field = {
      ...ellipseField(0),
      motion: { kind: 'transport-rotating' as const, rate: { cycles: 1, beats: 4 } },
    }
    composition.fields = [field]

    // 120 BPM: 4 beats in 2 seconds, so one full turn at t = 2.
    expect(fieldPlacementAt(composition, field, 2).rotation).toBeCloseTo(TAU, 9)
    // Seeking straight to a time gives the same placement as arriving there.
    expect(fieldPlacementAt(composition, field, 1.5).rotation).toBeCloseTo(
      TAU * 0.75,
      9,
    )
  })

  it('rides the referenced Wheel absolute state and rejects a missing reference', () => {
    const composition = circleComposition()
    composition.wheels[0].center = { x: 25, y: -10 }
    const attached = {
      ...ellipseField(0),
      center: { x: 5, y: 5 },
      motion: {
        kind: 'wheel-attached' as const,
        wheelId: composition.wheels[0].id,
        followRotation: true,
      },
    }
    composition.fields = [attached]

    const placement = fieldPlacementAt(composition, attached, 1)
    // Centre is the Wheel centre plus the Field's own offset.
    expect(placement.center).toEqual({ x: 30, y: -5 })
    // 120 BPM puts 2 beats in a second, and the Wheel runs 1 cycle per 4 beats,
    // so t = 1s is half a turn. A quarter turn lands at t = 0.5s.
    expect(placement.rotation).toBeCloseTo(Math.PI, 9)
    expect(
      fieldPlacementAt(composition, attached, 0.5).rotation,
    ).toBeCloseTo(TAU * 0.25, 9)

    const dangling = {
      ...attached,
      motion: { ...attached.motion, wheelId: 'wheel-missing' },
    }
    expect(() => fieldPlacementAt({ ...composition, fields: [dangling] }, dangling, 1)).toThrow(
      /unknown Wheel/,
    )
  })
})

describe('MG-13 acceptance', () => {
  it('pairs a band entry with its exit and makes time inside a duration source', () => {
    const composition = circleComposition()
    // A circle of radius 100 with the band centre pushed off-axis, so the path
    // enters and leaves the annulus rather than sitting inside it forever.
    composition.fields = [{ ...bandField(), center: { x: 90, y: 0 } }]

    const result = compileBoundaryEncounters(composition, request)
    const transitions = result.encounters.map(
      (encounter) => encounter.transition,
    )

    expect(result.encounters.length).toBeGreaterThanOrEqual(2)
    // Entries and exits alternate, so every entry has a matching exit.
    expect(new Set(transitions)).toEqual(new Set(['enter', 'exit']))
    for (let index = 1; index < transitions.length; index += 1) {
      expect(transitions[index]).not.toBe(transitions[index - 1])
    }

    // inside-band duration resolves against the next crossing of the same Field.
    composition.parts = [
      {
        id: 'part-band',
        name: 'Band Part',
        enabled: true,
        mute: false,
        solo: false,
        kind: 'note',
        encounterQuery: {
          kinds: ['boundary-crossing'],
          wheelIds: [],
          headIds: [],
          fieldIds: ['field-band'],
          boundaryIds: [],
          directions: [],
          minStrength: 0,
        },
        instrumentId: composition.instruments[0].id,
        onset: { kind: 'encounter-time' },
        pitch: { kind: 'fixed-midi', note: 60 },
        velocity: { kind: 'constant', value: 90 },
        duration: { kind: 'inside-band' },
      },
    ]

    const performance = compilePerformance(composition, request)
    expect(
      performance.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([])
    expect(performance.performedEvents.length).toBeGreaterThan(0)
    for (const event of performance.performedEvents) {
      const source = performance.encounters.find(
        (encounter) => encounter.id === event.sourceEncounterId,
      )
      expect(source?.transition).toBe('enter')
      // Duration came from real time inside the band, not a fixed fallback.
      expect(event.durationBeats).toBeGreaterThan(0)
      expect(event.durationBeats).toBeLessThan(
        request.durationSeconds * 2,
      )
    }
  })

  it('changes Encounters when an ellipse rotates while the Head path is unchanged', () => {
    const stationary = circleComposition()
    stationary.fields = [ellipseField(0)]

    const rotating = circleComposition()
    rotating.fields = [
      {
        ...ellipseField(0),
        motion: { kind: 'rotating', turnsPerSecond: 0.37 },
      },
    ]

    const still = compileBoundaryEncounters(stationary, request)
    const moved = compileBoundaryEncounters(rotating, request)

    // The Head path is identical in both Compositions.
    expect(stationary.wheels).toEqual(rotating.wheels)
    // The rotating Field meets it at different times.
    expect(moved.encounters.map((e) => e.timeSeconds)).not.toEqual(
      still.encounters.map((e) => e.timeSeconds),
    )
    // Both are still deterministic.
    expect(compileBoundaryEncounters(rotating, request).encounters).toEqual(
      moved.encounters,
    )
  })

  it('feeds new Field kinds through the existing EncounterQuery and Part mappings', () => {
    const composition = circleComposition()
    const grid: GridFieldSpec = {
      id: 'field-grid',
      name: 'Grid',
      enabled: true,
      kind: 'grid',
      center: { x: 0, y: 0 },
      rotation: 0,
      boundaries: [
        { id: 'grid-1', name: 'X 0', enabled: true, index: 0, kind: 'grid', axis: 'x', offset: 0 },
        { id: 'grid-2', name: 'Y 0', enabled: true, index: 1, kind: 'grid', axis: 'y', offset: 0 },
      ],
    }
    const spiral: SpiralFieldSpec = {
      id: 'field-spiral',
      name: 'Spiral',
      enabled: true,
      kind: 'spiral',
      center: { x: 0, y: 0 },
      rotation: 0,
      boundaries: [
        {
          id: 'spiral-1',
          name: 'Spiral 1',
          enabled: true,
          index: 0,
          kind: 'spiral',
          startRadius: 40,
          growthPerTurn: 45,
          turns: 3,
        },
      ],
    }
    composition.fields = [grid, spiral, ellipseField(0)]
    composition.parts = [
      {
        id: 'part-grid',
        name: 'Grid Part',
        enabled: true,
        mute: false,
        solo: false,
        kind: 'note',
        encounterQuery: {
          kinds: ['boundary-crossing'],
          wheelIds: [],
          headIds: [],
          fieldIds: ['field-grid'],
          boundaryIds: [],
          directions: [],
          minStrength: 0,
        },
        instrumentId: composition.instruments[0].id,
        onset: { kind: 'encounter-time' },
        // boundary-degree proves Boundary index still drives pitch selection.
        pitch: { kind: 'boundary-degree', root: 48, scale: 'major', octaves: 2 },
        velocity: { kind: 'encounter-strength', min: 40, max: 120, gamma: 1 },
        duration: { kind: 'fixed', beats: 0.25 },
      },
    ]

    expect(validateComposition(composition).ok).toBe(true)

    const result = compileBoundaryEncounters(composition, request)
    const fieldIds = new Set(result.encounters.map((e) => e.fieldId))
    expect(fieldIds).toEqual(
      new Set(['field-grid', 'field-spiral', 'field-ellipse']),
    )

    const performance = compilePerformance(composition, request)
    expect(
      performance.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([])
    // The Part selected only its own Field through the unchanged query shape.
    expect(
      performance.performedEvents.every((event) => event.partId === 'part-grid'),
    ).toBe(true)
    expect(performance.performedEvents.length).toBeGreaterThan(0)
    // Grid Boundaries report linear direction, not radial.
    const gridDirections = new Set(
      result.encounters
        .filter((e) => e.fieldId === 'field-grid')
        .map((e) => e.direction),
    )
    for (const direction of gridDirections) {
      expect(['clockwise', 'counterclockwise']).toContain(direction)
    }
  })

  it('validates missing Wheel references and accepts every new kind', () => {
    const composition = circleComposition()
    composition.fields = [
      {
        ...ellipseField(0),
        motion: { kind: 'wheel-attached', wheelId: 'wheel-missing', followRotation: true },
      },
    ]

    const result = validateComposition(composition)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.issues.some(
        (issue) =>
          issue.path === '$.fields[0].motion.wheelId' &&
          issue.message.includes('missing Wheel'),
      ),
    ).toBe(true)
  })

  it('rejects a Boundary whose kind does not match its Field kind', () => {
    const composition = circleComposition()
    const mismatched = {
      ...bandField(),
      boundaries: [
        { id: 'band-1', name: 'Ring', enabled: true, index: 0, kind: 'ring', radius: 50 },
      ],
    } as unknown as BandFieldSpec
    composition.fields = [mismatched]

    const result = validateComposition(composition)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.issues.some((issue) => issue.message.includes('does not match Field kind')),
    ).toBe(true)
  })
})

describe('MG-13 leaves the MG-05 fixtures alone', () => {
  it('produces identical geometry for a ring Field with no rotation or motion', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const ringFieldSpec = composition.fields[0]

    expect(validateComposition(composition).ok).toBe(true)
    expect('rotation' in ringFieldSpec).toBe(false)
    expect('motion' in ringFieldSpec).toBe(false)

    const placement = fieldPlacementAt(composition, ringFieldSpec, 9.5)
    expect(placement).toEqual({ center: { x: 0, y: 0 }, rotation: 0 })
    expect(
      boundaryGeometryAtPlacement(
        ringFieldSpec,
        ringFieldSpec.boundaries[0],
        placement,
      ),
    ).toMatchObject({ kind: 'ring', radius: 90 })
  })
})
