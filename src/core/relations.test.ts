import { describe, expect, it } from 'vitest'

import type { Composition, RelationSpec } from './composition'
import { validateComposition } from './compositionValidation'
import { defaultComposition } from './defaultComposition'
import { headStateAt } from './heads'
import { compilePerformance } from './performance'
import {
  compileControlLane,
  compileRelationEncounters,
  measureRelation,
  relationPairs,
  relationSeparation,
  signedAngleDifference,
} from './relations'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 240 }

/**
 * Two Heads on one Wheel tracing concentric circles at different radii, so
 * their separation and angles are analytically predictable.
 */
const twoHeadComposition = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.wheels[0].motion = {
    kind: 'lissajous',
    frequencyX: 1,
    frequencyY: 1,
    delta: Math.PI / 2,
  }
  composition.wheels[0].heads[0] = {
    ...composition.wheels[0].heads[0],
    id: 'head-a',
    name: 'Head A',
    phaseOffset: 0,
    attachment: {
      kind: 'lissajous',
      scaleX: 100,
      scaleY: 100,
      phaseX: 0,
      phaseY: 0,
    },
  }
  composition.wheels[0].heads.push({
    ...structuredClone(composition.wheels[0].heads[0]),
    id: 'head-b',
    name: 'Head B',
    // Half a turn out of phase, so the pair is diametrically opposed.
    phaseOffset: 0.5,
  })
  composition.fields = []
  composition.parts = []
  return composition
}

/**
 * Head A and Head B on separate Wheels running at different rates, so their
 * separation genuinely rises and falls and closest approaches are real.
 */
const twoWheelComposition = (): Composition => {
  const composition = twoHeadComposition()
  const [movedHead] = composition.wheels[0].heads.splice(1, 1)
  composition.wheels.push({
    ...structuredClone(composition.wheels[0]),
    id: 'wheel-2',
    name: 'Wheel 2',
    rate: { cycles: 3, beats: 4 },
    heads: [
      {
        ...movedHead,
        phaseOffset: 0,
        attachment: {
          kind: 'lissajous',
          scaleX: 40,
          scaleY: 40,
          phaseX: 0,
          phaseY: 0,
        },
      },
    ],
  })
  return composition
}

const relation = (overrides: Partial<RelationSpec> = {}): RelationSpec => ({
  id: 'relation-1',
  name: 'Pair',
  enabled: true,
  kind: 'conjunction',
  headIds: [],
  threshold: 20,
  hysteresis: 5,
  minSeparationSeconds: 0,
  ...overrides,
})

describe('relation measurement', () => {
  it('wraps signed angle differences into (-pi, pi]', () => {
    expect(signedAngleDifference(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 12)
    expect(signedAngleDifference(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 12)
    // Just past pi wraps to the negative side rather than reporting ~2pi.
    expect(signedAngleDifference(0, Math.PI + 0.1)).toBeCloseTo(
      -Math.PI + 0.1,
      12,
    )
    expect(Object.is(signedAngleDifference(1, 1), -0)).toBe(false)
  })

  it('measures an analytic two-Head fixture', () => {
    const composition = twoHeadComposition()
    const a = headStateAt(composition, 'head-a', 0)
    const b = headStateAt(composition, 'head-b', 0)
    const measurement = measureRelation(a, b, 0)

    // Opposed points on a radius-100 circle are 200 apart.
    expect(measurement.distance).toBeCloseTo(200, 6)
    // Same radius, so radial alignment is already satisfied.
    expect(measurement.radiusDifference).toBeCloseTo(0, 6)
    // Diametrically opposed means an angular difference of pi.
    expect(measurement.angularDifference).toBeCloseTo(Math.PI, 6)
    // Rigid rotation keeps the separation constant.
    expect(measurement.approachRate).toBeCloseTo(0, 4)
    expect(measurement.speedDifference).toBeCloseTo(0, 4)
  })

  it('follows the documented swap rule for pair order', () => {
    const composition = twoHeadComposition()
    const a = headStateAt(composition, 'head-a', 0.7)
    const b = headStateAt(composition, 'head-b', 0.7)
    const forward = measureRelation(a, b, 0.7)
    const reversed = measureRelation(b, a, 0.7)

    // Symmetric measurements are untouched by the swap.
    expect(reversed.distance).toBeCloseTo(forward.distance, 9)
    expect(reversed.radiusDifference).toBeCloseTo(forward.radiusDifference, 9)
    expect(reversed.angularDifference).toBeCloseTo(forward.angularDifference, 9)
    expect(reversed.speedDifference).toBeCloseTo(forward.speedDifference, 9)
    expect(reversed.approachRate).toBeCloseTo(forward.approachRate, 9)

    // The bearing is the one that carries orientation, and it flips by pi.
    expect(Math.abs(signedAngleDifference(forward.angle, reversed.angle))).toBeCloseTo(
      Math.PI,
      6,
    )
  })

  it('drives each detector kind to zero at its own target', () => {
    const composition = twoHeadComposition()
    const a = headStateAt(composition, 'head-a', 0)
    const b = headStateAt(composition, 'head-b', 0)
    const measurement = measureRelation(a, b, 0)

    // The pair is opposed, so opposition is satisfied and alignment is not.
    expect(relationSeparation('opposition', measurement)).toBeCloseTo(0, 6)
    expect(relationSeparation('angular-alignment', measurement)).toBeCloseTo(
      Math.PI,
      6,
    )
    expect(relationSeparation('radial-alignment', measurement)).toBeCloseTo(0, 6)
    expect(relationSeparation('conjunction', measurement)).toBeCloseTo(200, 6)
  })
})

describe('pair selection', () => {
  it('forbids self-pairs and orders each pair canonically', () => {
    const composition = twoHeadComposition()
    const { pairs } = relationPairs(composition, relation())

    expect(pairs).toHaveLength(1)
    expect(pairs[0].headAId).toBe('head-a')
    expect(pairs[0].headBId).toBe('head-b')
    expect(pairs[0].headAId).not.toBe(pairs[0].headBId)
  })

  it('produces every unordered pair once for three Heads', () => {
    const composition = twoHeadComposition()
    composition.wheels[0].heads.push({
      ...structuredClone(composition.wheels[0].heads[0]),
      id: 'head-c',
      name: 'Head C',
      phaseOffset: 0.25,
    })

    const { pairs } = relationPairs(composition, relation())
    const keys = pairs.map((pair) => `${pair.headAId}|${pair.headBId}`)

    expect(keys).toEqual(['head-a|head-b', 'head-a|head-c', 'head-b|head-c'])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('reports an unknown Head and a pairing that cannot form', () => {
    const composition = twoHeadComposition()
    const { diagnostics } = relationPairs(
      composition,
      relation({ headIds: ['head-a', 'head-missing'] }),
    )

    expect(diagnostics.map((item) => item.code)).toEqual([
      'unknown-head',
      'insufficient-pairs',
    ])
  })

  it('excludes disabled Heads from pairing', () => {
    const composition = twoHeadComposition()
    composition.wheels[0].heads[1].enabled = false

    const { pairs } = relationPairs(composition, relation())
    expect(pairs).toHaveLength(0)
  })
})

describe('detection policy', () => {
  it('reports one event per local minimum rather than a dense run', () => {
    // Heads on one Wheel rotate rigidly, so their separation never varies.
    // A genuine closest approach needs two Wheels turning at different rates.
    const composition = twoWheelComposition()
    composition.relations = [relation({ kind: 'closest-approach' })]

    const result = compileRelationEncounters(composition, request)

    expect(result.encounters.length).toBeGreaterThan(0)
    // A dense run would produce something near the sample count.
    expect(result.encounters.length).toBeLessThan(20)

    // Every reported time is a strict local minimum of the separation.
    for (const encounter of result.encounters) {
      const t = encounter.timeSeconds
      const step = 1 / request.sampleRateHz
      const at = (time: number) =>
        measureRelation(
          headStateAt(composition, 'head-a', time),
          headStateAt(composition, 'head-b', time),
          time,
        ).distance

      expect(at(t)).toBeLessThanOrEqual(at(t - step) + 1e-9)
      expect(at(t)).toBeLessThanOrEqual(at(t + step) + 1e-9)
    }
  })

  it('emits nothing for a rigidly rotating pair whose separation never varies', () => {
    // Regression: without a prominence floor, floating-point jitter on a flat
    // separation signal manufactured a local minimum on almost every sample.
    const composition = twoHeadComposition()
    composition.relations = [relation({ kind: 'closest-approach' })]

    const result = compileRelationEncounters(composition, request)

    expect(result.encounters).toHaveLength(0)
  })

  it('latches a threshold detector so a hovering pair cannot chatter', () => {
    const composition = twoHeadComposition()
    composition.wheels[0].heads[1].attachment = {
      kind: 'lissajous',
      scaleX: 90,
      scaleY: 90,
      phaseX: 0,
      phaseY: 0,
    }
    composition.wheels[0].heads[1].phaseOffset = 0.02

    const chatty = structuredClone(composition)
    chatty.relations = [
      relation({ kind: 'conjunction', threshold: 40, hysteresis: 0 }),
    ]
    const damped = structuredClone(composition)
    damped.relations = [
      relation({ kind: 'conjunction', threshold: 40, hysteresis: 60 }),
    ]

    const chattyCount = compileRelationEncounters(chatty, request).encounters
      .length
    const dampedCount = compileRelationEncounters(damped, request).encounters
      .length

    // Wider release means the detector re-arms less often, never more.
    expect(dampedCount).toBeLessThanOrEqual(chattyCount)
  })

  it('debounces repeat fires inside the minimum separation', () => {
    const composition = twoWheelComposition()

    const loose = structuredClone(composition)
    loose.relations = [
      relation({ kind: 'closest-approach', minSeparationSeconds: 0 }),
    ]
    const tight = structuredClone(composition)
    tight.relations = [
      relation({ kind: 'closest-approach', minSeparationSeconds: 3 }),
    ]

    const looseResult = compileRelationEncounters(loose, request)
    const tightResult = compileRelationEncounters(tight, request)

    expect(tightResult.encounters.length).toBeLessThanOrEqual(
      looseResult.encounters.length,
    )
    // No two surviving events are closer than the declared separation.
    for (let i = 1; i < tightResult.encounters.length; i += 1) {
      expect(
        tightResult.encounters[i].timeSeconds -
          tightResult.encounters[i - 1].timeSeconds,
      ).toBeGreaterThanOrEqual(3 - 1e-9)
    }
  })

  it('is deterministic and totally ordered', () => {
    const composition = twoHeadComposition()
    composition.relations = [relation({ kind: 'conjunction', threshold: 500 })]

    const first = compileRelationEncounters(composition, request)
    const second = compileRelationEncounters(composition, request)

    expect(second.encounters).toEqual(first.encounters)
    const times = first.encounters.map((item) => item.timeSeconds)
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })
})

describe('control lanes', () => {
  it('is bounded, ordered, and reproducible at its declared rate', () => {
    const composition = twoHeadComposition()
    const part = {
      id: 'part-control',
      control: {
        name: 'pan',
        source: 'distance' as const,
        min: -1,
        max: 1,
        sampleRateHz: 20,
        smoothingSeconds: 0.05,
      },
    }
    const pair = { headAId: 'head-a', headBId: 'head-b' }

    const lane = compileControlLane(composition, request, part, pair)
    const again = compileControlLane(composition, request, part, pair)

    // Reproducible.
    expect(again).toEqual(lane)
    // Declared rate over the window, inclusive of both ends.
    expect(lane.points).toHaveLength(
      request.durationSeconds * part.control.sampleRateHz + 1,
    )
    // Ordered and evenly spaced.
    for (let index = 1; index < lane.points.length; index += 1) {
      expect(lane.points[index].timeSeconds).toBeGreaterThan(
        lane.points[index - 1].timeSeconds,
      )
      expect(
        lane.points[index].timeSeconds - lane.points[index - 1].timeSeconds,
      ).toBeCloseTo(1 / part.control.sampleRateHz, 9)
    }
    // Bounded by the declared range.
    for (const point of lane.points) {
      expect(point.value).toBeGreaterThanOrEqual(-1)
      expect(point.value).toBeLessThanOrEqual(1)
    }
  })

  it('compiles from a Control Part without any Instrument reading HeadState', () => {
    const composition = twoHeadComposition()
    composition.relations = [relation({ kind: 'conjunction', threshold: 250 })]
    composition.parts = [
      {
        id: 'part-control',
        name: 'Distance to pan',
        enabled: true,
        mute: false,
        solo: false,
        kind: 'control',
        encounterQuery: {
          kinds: ['conjunction'],
          wheelIds: [],
          headIds: [],
          fieldIds: [],
          boundaryIds: [],
          directions: [],
          minStrength: 0,
          relationIds: ['relation-1'],
        },
        instrumentId: composition.instruments[0].id,
        control: {
          name: 'pan',
          source: 'approach-rate',
          min: -1,
          max: 1,
          sampleRateHz: 30,
          smoothingSeconds: 0.1,
        },
      },
    ]

    expect(validateComposition(composition).ok).toBe(true)

    const performance = compilePerformance(composition, request)

    expect(
      performance.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([])
    expect(performance.controlLanes).toHaveLength(1)
    expect(performance.controlLanes[0].partId).toBe('part-control')
    expect(performance.controlLanes[0].points.length).toBeGreaterThan(0)
    // A Control Part drives a lane, not notes.
    expect(performance.performedEvents).toHaveLength(0)
    // The relation itself is available to Parts as canonical output.
    expect(performance.relationEncounters.length).toBeGreaterThan(0)
  })

  it('warns instead of throwing when a Control Part has no pair to measure', () => {
    const composition = twoHeadComposition()
    composition.wheels[0].heads = [composition.wheels[0].heads[0]]
    composition.parts = [
      {
        id: 'part-control',
        name: 'Lonely control',
        enabled: true,
        mute: false,
        solo: false,
        kind: 'control',
        encounterQuery: {
          kinds: ['conjunction'],
          wheelIds: [],
          headIds: [],
          fieldIds: [],
          boundaryIds: [],
          directions: [],
          minStrength: 0,
        },
        instrumentId: composition.instruments[0].id,
        control: {
          name: 'pan',
          source: 'distance',
          min: 0,
          max: 1,
          sampleRateHz: 10,
          smoothingSeconds: 0,
        },
      },
    ]

    const performance = compilePerformance(composition, request)

    expect(performance.controlLanes).toHaveLength(0)
    expect(
      performance.diagnostics.some(
        (item) => item.code === 'control-part' && item.severity === 'warning',
      ),
    ).toBe(true)
  })
})

describe('relation validation', () => {
  it('rejects an unknown Head and an unknown relation reference', () => {
    const composition = twoHeadComposition()
    composition.relations = [relation({ headIds: ['head-missing'] })]

    const result = validateComposition(composition)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.issues.some((issue) => issue.path === '$.relations[0].headIds[0]'),
    ).toBe(true)
  })

  it('accepts a Composition with no relations at all', () => {
    const composition = twoHeadComposition()
    expect('relations' in composition).toBe(false)
    expect(validateComposition(composition).ok).toBe(true)
  })
})
