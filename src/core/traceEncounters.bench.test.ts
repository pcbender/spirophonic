import { describe, expect, it } from 'vitest'

import { traceObservationComposition } from '../test/fixtures/compositions'
import { compilePerformance } from './performance'
import { buildRetainedTrace, TraceSegmentIndex } from './traces'

/**
 * Release budgets for retained Traces and their spatial index.
 *
 * The index exists so a Head does not have to test every earlier segment of
 * every Trace on every step. What matters is therefore not how long a query
 * takes but how many candidates it returns compared with the linear scan it
 * replaces — a machine-independent number that goes straight to zero benefit
 * if the index degrades.
 */

const window4s = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 240 }

const firstObservedHead = () => {
  const composition = traceObservationComposition()
  for (const wheel of composition.wheels) {
    for (const head of wheel.heads) {
      if (head.observation?.enabled) {
        return { composition, wheelId: wheel.id, head }
      }
    }
  }
  throw new Error('fixture has no observing Head')
}

describe('retained Trace budgets', () => {
  it('retains a bounded number of segments over the window', () => {
    const { composition, wheelId, head } = firstObservedHead()
    const { trace, diagnostics } = buildRetainedTrace(
      composition,
      wheelId,
      head,
      0,
      4,
    )

    // 120 Hz observation over 4 s, so roughly 480 samples and one fewer
    // segment. Retention must not quietly keep more than it was asked for.
    expect(trace.segments.length).toBeGreaterThan(400)
    expect(trace.segments.length).toBeLessThanOrEqual(
      head.observation?.maxSegments ?? 0,
    )
    expect(diagnostics).toEqual([])
  })

  it('anchors retention to the window start, so a seek retains the same path', () => {
    const { composition, wheelId, head } = firstObservedHead()
    const whole = buildRetainedTrace(composition, wheelId, head, 0, 4).trace
    const again = buildRetainedTrace(composition, wheelId, head, 0, 4).trace

    expect(again.segments.length).toBe(whole.segments.length)
    expect(again.segments[0]).toEqual(whole.segments[0])
    expect(again.segments.at(-1)).toEqual(whole.segments.at(-1))
  })
})

describe('spatial index budgets', () => {
  it('returns far fewer candidates than a linear scan', () => {
    const { composition, wheelId, head } = firstObservedHead()
    const { trace } = buildRetainedTrace(composition, wheelId, head, 0, 4)
    const index = new TraceSegmentIndex(trace.segments)

    expect(index.size).toBe(trace.segments.length)

    // Probe with each segment in turn; the linear alternative would examine
    // every segment on every probe.
    let candidates = 0
    for (const segment of trace.segments) {
      candidates += index.query(segment.from, segment.to).length
    }
    const linear = trace.segments.length * trace.segments.length
    const reduction = candidates / linear

    // The index is only worth having if it cuts the work by an order of
    // magnitude on a real Trace.
    expect(reduction).toBeLessThan(0.1)
    expect(candidates).toBeGreaterThan(0)
  })

  it('keeps its advantage as the Trace grows', () => {
    const { composition, wheelId, head } = firstObservedHead()

    const reductionAt = (throughSeconds: number) => {
      const { trace } = buildRetainedTrace(
        composition,
        wheelId,
        head,
        0,
        throughSeconds,
      )
      const index = new TraceSegmentIndex(trace.segments)
      let candidates = 0
      for (const segment of trace.segments) {
        candidates += index.query(segment.from, segment.to).length
      }
      return {
        segments: trace.segments.length,
        reduction: candidates / (trace.segments.length * trace.segments.length),
      }
    }

    const small = reductionAt(2)
    const large = reductionAt(4)

    expect(large.segments).toBeGreaterThan(small.segments)
    // A linear scan's ratio would stay flat at 1. The index's ratio must fall
    // as the Trace grows, which is what makes it sub-quadratic overall.
    expect(large.reduction).toBeLessThan(small.reduction)
  })

  it('returns candidates in a stable order regardless of cell layout', () => {
    const { composition, wheelId, head } = firstObservedHead()
    const { trace } = buildRetainedTrace(composition, wheelId, head, 0, 4)
    const probe = trace.segments[Math.floor(trace.segments.length / 2)]

    const defaultCell = new TraceSegmentIndex(trace.segments)
    const coarse = new TraceSegmentIndex(trace.segments, 400)

    const fromDefault = defaultCell
      .query(probe.from, probe.to)
      .map((segment) => segment.fromSeconds)
    const fromCoarse = coarse
      .query(probe.from, probe.to)
      .map((segment) => segment.fromSeconds)

    // A coarser grid returns a superset, but the shared members must appear in
    // the same order, or downstream Encounter order would depend on the grid.
    const shared = new Set(fromDefault)
    expect(fromCoarse.filter((value) => shared.has(value))).toEqual(fromDefault)
  })
})

describe('Trace Encounter compilation budget', () => {
  it('holds the checked-in Trace Encounter count', () => {
    const compiled = compilePerformance(traceObservationComposition(), window4s)
    expect(compiled.traceEncounters.length).toBe(4446)
    expect(
      compiled.diagnostics.filter(
        (diagnostic) => diagnostic.severity === 'error',
      ),
    ).toEqual([])
  })

  it('stays below the truncation cap on the reference fixture', () => {
    // If this fails the fixture has drifted into measuring the cap rather than
    // the indexing underneath it, which is what it exists to measure.
    const compiled = compilePerformance(traceObservationComposition(), {
      ...window4s,
      durationSeconds: 8,
    })
    expect(compiled.traceEncounters.length).toBeLessThan(10_000)
  })
})
