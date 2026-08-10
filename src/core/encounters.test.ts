import { describe, expect, it } from 'vitest'

import type { Composition } from './composition'
import { defaultComposition } from './defaultComposition'
import {
  boundaryEncountersForPath,
  compileBoundaryEncounters,
  sortBoundaryEncounters,
  type BoundaryCrossingEncounter,
  type EncounterPathState,
} from './encounters'
import type { BoundaryGeometry } from './fields'

const ring: BoundaryGeometry = Object.freeze({
  kind: 'ring',
  fieldId: 'field-rings',
  boundaryId: 'ring-1',
  name: 'Ring 1',
  index: 0,
  center: Object.freeze({ x: 0, y: 0 }),
  radius: 1,
})

const spoke: BoundaryGeometry = Object.freeze({
  kind: 'spoke',
  fieldId: 'field-spokes',
  boundaryId: 'spoke-1',
  name: 'Spoke 1',
  index: 0,
  center: Object.freeze({ x: 0, y: 0 }),
  angle: 0,
  angularWidth: 0,
  length: 10,
  direction: Object.freeze({ x: 1, y: 0 }),
})

const wedge: BoundaryGeometry = Object.freeze({
  ...spoke,
  boundaryId: 'wedge-1',
  angularWidth: 0.4,
  length: 20,
})

const linearState = (timeSeconds: number): EncounterPathState => ({
  timeSeconds,
  position: { x: -2 + timeSeconds * 4, y: 0 },
  velocity: { x: 4, y: 0 },
  wheelPhase: timeSeconds,
})

const handPath = () =>
  boundaryEncountersForPath({
    transport: structuredClone(defaultComposition.transport),
    wheelId: 'wheel-a',
    headId: 'head-a',
    boundary: ring,
    sampleTimes: [0, 0.5, 1],
    stateAt: linearState,
  })

const ellipseComposition = (): Composition => {
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
    scaleY: 50,
    phaseX: 0,
    phaseY: 0,
  }
  composition.fields = [
    {
      id: 'field-rings',
      name: 'Rings',
      enabled: true,
      kind: 'rings',
      center: { x: 0, y: 0 },
      boundaries: [
        {
          id: 'ring-75',
          name: 'Ring 75',
          enabled: true,
          index: 0,
          kind: 'ring',
          radius: 75,
        },
      ],
    },
  ]
  return composition
}

describe('Boundary Encounter fixtures', () => {
  it('produces a byte-stable physical fixture from a hand-constructed path', () => {
    const first = handPath()
    const second = handPath()
    const expected = [
      {
        id: 'boundary-crossing/wheel-a/head-a/field-rings/ring-1/0.250000000',
        kind: 'boundary-crossing',
        timeSeconds: 0.25,
        subjectIds: ['wheel-a', 'head-a'],
        wheelId: 'wheel-a',
        headId: 'head-a',
        fieldId: 'field-rings',
        boundaryId: 'ring-1',
        boundaryIndex: 0,
        boundaryKind: 'ring',
        position: { x: -1, y: 0 },
        direction: 'inward',
        strength: 1,
        speed: 4,
        incidenceAngle: 0,
        wheelPhase: 0.25,
        absoluteBeat: 0.5,
        barIndex: 0,
        beatInBar: 0.5,
        barPhase: 0.125,
      },
      {
        id: 'boundary-crossing/wheel-a/head-a/field-rings/ring-1/0.750000000',
        kind: 'boundary-crossing',
        timeSeconds: 0.75,
        subjectIds: ['wheel-a', 'head-a'],
        wheelId: 'wheel-a',
        headId: 'head-a',
        fieldId: 'field-rings',
        boundaryId: 'ring-1',
        boundaryIndex: 0,
        boundaryKind: 'ring',
        position: { x: 1, y: 0 },
        direction: 'outward',
        strength: 1,
        speed: 4,
        incidenceAngle: 0,
        wheelPhase: 0.75,
        absoluteBeat: 1.5,
        barIndex: 0,
        beatInBar: 1.5,
        barPhase: 0.375,
      },
    ]

    expect(first.diagnostics).toEqual([])
    expect(JSON.stringify(first.encounters)).toBe(JSON.stringify(expected))
    expect(second).toEqual(first)
  })

  it('classifies spoke direction clockwise and counterclockwise', () => {
    const encounter = (fromY: number, toY: number) =>
      boundaryEncountersForPath({
        transport: structuredClone(defaultComposition.transport),
        wheelId: 'wheel-a',
        headId: 'head-a',
        boundary: spoke,
        sampleTimes: [0, 1],
        stateAt: (timeSeconds) => ({
          timeSeconds,
          position: { x: 2, y: fromY + (toY - fromY) * timeSeconds },
          velocity: { x: 0, y: toY - fromY },
          wheelPhase: timeSeconds,
        }),
      }).encounters[0]

    expect(encounter(-1, 1).direction).toBe('counterclockwise')
    expect(encounter(1, -1).direction).toBe('clockwise')
  })

  it('emits one entry and one exit for a complete wedge visit', () => {
    const stateAt = (timeSeconds: number): EncounterPathState => {
      const angle = -0.5 + timeSeconds
      return {
        timeSeconds,
        position: { x: 10 * Math.cos(angle), y: 10 * Math.sin(angle) },
        velocity: { x: -10 * Math.sin(angle), y: 10 * Math.cos(angle) },
        wheelPhase: timeSeconds,
      }
    }
    const result = boundaryEncountersForPath({
      transport: structuredClone(defaultComposition.transport),
      wheelId: 'wheel-a',
      headId: 'head-a',
      boundary: wedge,
      sampleTimes: [0, 0.25, 0.5, 0.75, 1],
      stateAt,
    })

    expect(result.diagnostics).toEqual([])
    expect(result.encounters).toHaveLength(2)
    expect(result.encounters.map((event) => event.transition)).toEqual([
      'enter',
      'exit',
    ])
    expect(result.encounters.map((event) => event.direction)).toEqual([
      'counterclockwise',
      'counterclockwise',
    ])
    expect(result.encounters[0].timeSeconds).toBeCloseTo(0.3, 6)
    expect(result.encounters[1].timeSeconds).toBeCloseTo(0.7, 6)
  })

  it('gates a sine path weaving across the finite Spoke outer edge', () => {
    const outerEdge = wedge.length * Math.cos(wedge.angularWidth / 2)
    const stateAt = (timeSeconds: number): EncounterPathState => ({
      timeSeconds,
      position: {
        x: outerEdge + 2 * Math.cos(Math.PI * 2 * timeSeconds),
        y: 0,
      },
      velocity: {
        x: -Math.PI * 4 * Math.sin(Math.PI * 2 * timeSeconds),
        y: 0,
      },
      wheelPhase: timeSeconds,
    })
    const result = boundaryEncountersForPath({
      transport: structuredClone(defaultComposition.transport),
      wheelId: 'wheel-a',
      headId: 'head-a',
      boundary: wedge,
      sampleTimes: Array.from({ length: 121 }, (_, index) => index / 120),
      stateAt,
    })

    expect(result.diagnostics).toEqual([])
    expect(result.encounters.map((event) => event.transition)).toEqual([
      'enter',
      'exit',
    ])
    expect(result.encounters.map((event) => event.direction)).toEqual([
      'inward',
      'outward',
    ])
    expect(result.encounters[0].timeSeconds).toBeCloseTo(0.25, 6)
    expect(result.encounters[1].timeSeconds).toBeCloseTo(0.75, 6)
    expect(result.encounters[0].position.x).toBeCloseTo(outerEdge, 6)
    expect(result.encounters[1].position.x).toBeCloseTo(outerEdge, 6)
  })

  it('sorts simultaneous crossings by subject and then Boundary ID', () => {
    const base = handPath().encounters[0]
    const fixture = (
      wheelId: string,
      headId: string,
      boundaryId: string,
    ): BoundaryCrossingEncounter => ({
      ...base,
      id: `${wheelId}/${headId}/${boundaryId}`,
      subjectIds: [wheelId, headId],
      wheelId,
      headId,
      boundaryId,
    })
    const sorted = sortBoundaryEncounters([
      fixture('wheel-b', 'head-a', 'boundary-a'),
      fixture('wheel-a', 'head-b', 'boundary-a'),
      fixture('wheel-a', 'head-a', 'boundary-b'),
      fixture('wheel-a', 'head-a', 'boundary-a'),
    ])

    expect(sorted.map((encounter) => encounter.id)).toEqual([
      'wheel-a/head-a/boundary-a',
      'wheel-a/head-a/boundary-b',
      'wheel-a/head-b/boundary-a',
      'wheel-b/head-a/boundary-a',
    ])
  })
})

describe('Composition Encounter compilation', () => {
  it('converges across supported sample rates and measures ring direction', () => {
    const composition = ellipseComposition()
    const at40Hz = compileBoundaryEncounters(composition, {
      startSeconds: 0,
      durationSeconds: 2,
      sampleRateHz: 40,
    })
    const at160Hz = compileBoundaryEncounters(composition, {
      startSeconds: 0,
      durationSeconds: 2,
      sampleRateHz: 160,
    })

    expect(at40Hz.diagnostics).toEqual([])
    expect(at160Hz.diagnostics).toEqual([])
    expect(at40Hz.encounters).toHaveLength(4)
    expect(at160Hz.encounters).toHaveLength(4)
    expect(at40Hz.encounters.map((encounter) => encounter.direction)).toEqual([
      'inward',
      'outward',
      'inward',
      'outward',
    ])
    at40Hz.encounters.forEach((encounter, index) => {
      expect(
        Math.abs(encounter.timeSeconds - at160Hz.encounters[index].timeSeconds),
      ).toBeLessThan(1e-7)
    })
  })

  it('excludes disabled subjects and Boundaries', () => {
    const disabledHead = ellipseComposition()
    const disabledBoundary = ellipseComposition()
    disabledHead.wheels[0].heads[0].enabled = false
    disabledBoundary.fields[0].boundaries[0].enabled = false
    const request = {
      startSeconds: 0,
      durationSeconds: 2,
      sampleRateHz: 40,
    }

    expect(compileBoundaryEncounters(disabledHead, request).encounters).toEqual(
      [],
    )
    expect(
      compileBoundaryEncounters(disabledBoundary, request).encounters,
    ).toEqual([])
  })

  it('reports low resolution and enforces the maximum Encounter count', () => {
    const composition = ellipseComposition()
    const lowResolution = compileBoundaryEncounters(composition, {
      startSeconds: 0,
      durationSeconds: 2,
      sampleRateHz: 10,
    })
    const limited = compileBoundaryEncounters(
      composition,
      { startSeconds: 0, durationSeconds: 2, sampleRateHz: 40 },
      { maxEncounters: 2 },
    )

    expect(lowResolution.diagnostics).toMatchObject([
      { code: 'low-sample-rate', wheelId: 'wheel-1' },
    ])
    expect(limited.encounters).toHaveLength(2)
    expect(limited.diagnostics).toMatchObject([
      { code: 'maximum-encounter-count' },
    ])
  })

  it('is deterministic and contains no musical interpretation choices', () => {
    const composition = ellipseComposition()
    const request = {
      startSeconds: 0,
      durationSeconds: 2,
      sampleRateHz: 40,
    }
    const first = compileBoundaryEncounters(composition, request)
    const second = compileBoundaryEncounters(composition, request)

    expect(second).toEqual(first)
    for (const encounter of first.encounters) {
      expect(encounter).not.toHaveProperty('note')
      expect(encounter).not.toHaveProperty('scale')
      expect(encounter).not.toHaveProperty('velocity')
      expect(encounter).not.toHaveProperty('instrumentId')
    }
  })
})
