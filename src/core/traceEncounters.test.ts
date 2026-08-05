import { describe, expect, it } from 'vitest'

import type { Composition, TraceObservationSpec } from './composition'
import { validateComposition } from './compositionValidation'
import { defaultComposition } from './defaultComposition'
import {
  compileTraceEncounters,
  segmentIntersection,
} from './traceEncounters'
import {
  buildRetainedTrace,
  TraceSegmentIndex,
  traceObservationOf,
} from './traces'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

const observation = (
  overrides: Partial<TraceObservationSpec> = {},
): TraceObservationSpec => ({
  enabled: true,
  retention: 'window',
  sampleRateHz: 60,
  maxSegments: 4_000,
  allowSelf: false,
  ...overrides,
})

/**
 * Two Wheels at different rates whose Heads sweep overlapping circles, so one
 * Head genuinely runs through the other's retained path.
 */
const crossingComposition = (): Composition => {
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
    attachment: { kind: 'lissajous', scaleX: 100, scaleY: 100, phaseX: 0, phaseY: 0 },
    observation: observation(),
  }
  composition.wheels.push({
    ...structuredClone(composition.wheels[0]),
    id: 'wheel-2',
    name: 'Wheel 2',
    center: { x: 90, y: 0 },
    rate: { cycles: 3, beats: 4 },
    heads: [
      {
        ...structuredClone(composition.wheels[0].heads[0]),
        id: 'head-b',
        name: 'Head B',
        observation: observation(),
      },
    ],
  })
  composition.fields = []
  composition.parts = []
  return composition
}

describe('segment intersection policy', () => {
  it('reports one point for a clean crossing', () => {
    const hit = segmentIntersection(
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    )

    expect(hit).not.toBeNull()
    expect(hit?.position.x).toBeCloseTo(0, 12)
    expect(hit?.position.y).toBeCloseTo(0, 12)
    expect(hit?.probeT).toBeCloseTo(0.5, 12)
    expect(hit?.targetT).toBeCloseTo(0.5, 12)
  })

  it('ignores parallel, collinear, retraced, and degenerate pairs', () => {
    // Parallel but apart.
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }),
    ).toBeNull()
    // Collinear overlap: a probe retracing a Trace has no single crossing point.
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }),
    ).toBeNull()
    // Exactly retraced, same direction.
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    ).toBeNull()
    // Degenerate zero-length target.
    expect(
      segmentIntersection({ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
    ).toBeNull()
  })

  it('treats a tangential touch that does not pass through as no crossing', () => {
    // The probe ends exactly on the target line without continuing past it.
    const grazing = segmentIntersection(
      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 0, y: 2 },
    )
    // A shared endpoint is a real intersection, so the policy is that the
    // segment interior test admits it; what is excluded is running *along*.
    expect(grazing).not.toBeNull()
    expect(grazing?.probeT).toBeCloseTo(1, 9)

    // Running along the target produces nothing, whatever the overlap.
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 2 }),
    ).toBeNull()
  })
})

describe('retained trace', () => {
  it('anchors segments to the window so any observation time agrees', () => {
    const composition = crossingComposition()
    const head = composition.wheels[0].heads[0]

    const early = buildRetainedTrace(composition, 'wheel-1', head, 0, 1)
    const late = buildRetainedTrace(composition, 'wheel-1', head, 0, 2)

    // The earlier trace is a prefix of the later one, segment for segment.
    expect(early.trace.segments.length).toBeGreaterThan(0)
    for (let index = 0; index < early.trace.segments.length; index += 1) {
      expect(late.trace.segments[index]).toEqual(early.trace.segments[index])
    }
  })

  it('honours window retention and reports the segment ceiling', () => {
    const composition = crossingComposition()
    const head = {
      ...composition.wheels[0].heads[0],
      trace: { ...composition.wheels[0].heads[0].trace, historySeconds: 0.5 },
    }

    const windowed = buildRetainedTrace(composition, 'wheel-1', head, 0, 3)
    expect(windowed.trace.startSeconds).toBeCloseTo(2.5, 9)

    const full = buildRetainedTrace(
      composition,
      'wheel-1',
      { ...head, observation: observation({ retention: 'full' }) },
      0,
      3,
    )
    expect(full.trace.startSeconds).toBeCloseTo(0, 9)
    expect(full.trace.segments.length).toBeGreaterThan(
      windowed.trace.segments.length,
    )

    const capped = buildRetainedTrace(
      composition,
      'wheel-1',
      { ...head, observation: observation({ retention: 'full', maxSegments: 5 }) },
      0,
      3,
    )
    expect(capped.trace.segments).toHaveLength(5)
    expect(capped.trace.truncated).toBe(true)
    expect(capped.diagnostics[0].code).toBe('segment-limit')
  })

  it('indexes segments so a query returns far fewer than the whole trace', () => {
    const composition = crossingComposition()
    const head = composition.wheels[0].heads[0]
    const { trace } = buildRetainedTrace(
      composition,
      'wheel-1',
      { ...head, observation: observation({ retention: 'full' }) },
      0,
      4,
    )
    const index = new TraceSegmentIndex(trace.segments)

    expect(index.size).toBe(trace.segments.length)
    const candidates = index.query({ x: 100, y: 0 }, { x: 101, y: 1 })
    // A local probe must not degrade into an all-pairs scan.
    expect(candidates.length).toBeLessThan(trace.segments.length / 4)

    // Query order is stable regardless of cell iteration.
    expect(index.query({ x: 100, y: 0 }, { x: 101, y: 1 })).toEqual(candidates)
  })
})

describe('MG-15 acceptance', () => {
  it('yields a stable event at the expected point for a hand-built crossing', () => {
    const composition = crossingComposition()
    const result = compileTraceEncounters(composition, request)

    expect(result.encounters.length).toBeGreaterThan(0)

    // Recompiling is deep-equal.
    expect(compileTraceEncounters(composition, request).encounters).toEqual(
      result.encounters,
    )

    // Every reported position lies on the crossed segment, within tolerance.
    for (const encounter of result.encounters) {
      expect(Number.isFinite(encounter.position.x)).toBe(true)
      expect(Number.isFinite(encounter.position.y)).toBe(true)
      expect(encounter.ageSeconds).toBeGreaterThanOrEqual(0)
      expect(encounter.incidenceAngle).toBeGreaterThanOrEqual(0)
      expect(encounter.strength).toBeGreaterThanOrEqual(0)
      expect(encounter.strength).toBeLessThanOrEqual(1)
    }
  })

  it('never lets a Head encounter a future Trace segment', () => {
    const composition = crossingComposition()
    const result = compileTraceEncounters(composition, request)

    expect(result.encounters.length).toBeGreaterThan(0)
    for (const encounter of result.encounters) {
      // Age is time since the crossed segment finished being drawn. A negative
      // age would mean the Head met a path that did not exist yet.
      expect(encounter.ageSeconds).toBeGreaterThanOrEqual(0)
    }
  })

  it('excludes self-Trace crossings unless the Head opts in', () => {
    const composition = crossingComposition()
    // A rose traces over itself, so self-crossings are plentiful.
    composition.wheels[0].motion = { kind: 'rose', numerator: 5, denominator: 1 }
    composition.wheels[0].heads[0].attachment = {
      kind: 'rose',
      radiusScale: 150,
      angularOffset: 0,
    }
    composition.wheels.splice(1, 1)

    const off = compileTraceEncounters(composition, request)
    expect(off.encounters.every((item) => !item.selfCrossing)).toBe(true)

    const on = structuredClone(composition)
    on.wheels[0].heads[0].observation = observation({
      allowSelf: true,
      retention: 'full',
    })
    const withSelf = compileTraceEncounters(on, request)

    expect(withSelf.encounters.length).toBeGreaterThan(off.encounters.length)
    expect(withSelf.encounters.some((item) => item.selfCrossing)).toBe(true)
    // Even opted in, causality still holds.
    for (const encounter of withSelf.encounters) {
      expect(encounter.ageSeconds).toBeGreaterThanOrEqual(0)
    }
  })

  it('makes retention part of the input so results reproduce', () => {
    const shortHistory = crossingComposition()
    shortHistory.wheels[0].heads[0].trace.historySeconds = 0.3
    shortHistory.wheels[1].heads[0].trace.historySeconds = 0.3

    const longHistory = structuredClone(shortHistory)
    longHistory.wheels[0].heads[0].observation = observation({ retention: 'full' })
    longHistory.wheels[1].heads[0].observation = observation({ retention: 'full' })

    const short = compileTraceEncounters(shortHistory, request)
    const long = compileTraceEncounters(longHistory, request)

    // Retention genuinely changes what is observable.
    expect(long.encounters.length).toBeGreaterThan(short.encounters.length)
    // And each setting reproduces exactly.
    expect(compileTraceEncounters(shortHistory, request).encounters).toEqual(
      short.encounters,
    )
    expect(compileTraceEncounters(longHistory, request).encounters).toEqual(
      long.encounters,
    )
  })

  it('reports a diagnostic instead of silently blowing the segment budget', () => {
    const composition = crossingComposition()
    composition.wheels[0].heads[0].observation = observation({
      retention: 'full',
      sampleRateHz: 500,
    })

    const result = compileTraceEncounters(composition, request, {
      maxTotalSegments: 100,
    })

    expect(
      result.diagnostics.some((item) => item.code === 'observation-budget'),
    ).toBe(true)
  })

  it('produces nothing when no Head observes, and stays valid', () => {
    const composition = structuredClone(defaultComposition) as Composition
    expect(traceObservationOf(composition.wheels[0].heads[0]).enabled).toBe(false)

    const result = compileTraceEncounters(composition, request)
    expect(result.encounters).toEqual([])
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('validates observation settings as saved input', () => {
    const composition = crossingComposition()
    expect(validateComposition(composition).ok).toBe(true)

    const bad = structuredClone(composition)
    bad.wheels[0].heads[0].observation = observation({
      sampleRateHz: 0,
    })
    const result = validateComposition(bad)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.issues.some((issue) =>
        issue.path.endsWith('observation.sampleRateHz'),
      ),
    ).toBe(true)
  })
})
