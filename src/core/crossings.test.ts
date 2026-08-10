import { describe, expect, it } from 'vitest'

import type { BoundaryGeometry } from './fields'
import {
  scanBoundaryCrossings,
  type TimedPathPoint,
} from './crossings'

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
  direction: Object.freeze({ x: 1, y: 0 }),
})

const wedge: BoundaryGeometry = Object.freeze({
  ...spoke,
  boundaryId: 'wedge-1',
  angularWidth: 0.4,
})

const point = (
  timeSeconds: number,
  x: number,
  y: number,
): TimedPathPoint => ({ timeSeconds, position: { x, y } })

describe('Boundary crossing scan', () => {
  it('refines two ring crossings from deterministic time intervals', () => {
    const result = scanBoundaryCrossings(
      ring,
      [0, 0.5, 1],
      (timeSeconds) => point(timeSeconds, -2 + timeSeconds * 4, 0),
    )

    expect(result.diagnostics).toEqual([])
    expect(result.crossings).toMatchObject([
      {
        fieldId: 'field-rings',
        boundaryId: 'ring-1',
        kind: 'ring',
        timeSeconds: 0.25,
        position: { x: -1, y: 0 },
        fromDistance: 1,
        toDistance: -1,
        converged: true,
      },
      {
        fieldId: 'field-rings',
        boundaryId: 'ring-1',
        kind: 'ring',
        timeSeconds: 0.75,
        position: { x: 1, y: 0 },
        fromDistance: -1,
        toDistance: 1,
        converged: true,
      },
    ])
  })

  it('emits an exact-sample crossing once rather than from both intervals', () => {
    const result = scanBoundaryCrossings(
      ring,
      [0, 0.5, 1],
      (timeSeconds) => point(timeSeconds, timeSeconds * 2, 0),
    )

    expect(result.crossings).toHaveLength(1)
    expect(result.crossings[0]).toMatchObject({
      timeSeconds: 0.5,
      position: { x: 1, y: 0 },
      iterations: 0,
    })
  })

  it('does not turn a tangent touch into a crossing', () => {
    const result = scanBoundaryCrossings(
      ring,
      [0, 0.5, 1],
      (timeSeconds) =>
        point(timeSeconds, 1 + (timeSeconds - 0.5) ** 2, 0),
    )

    expect(result.crossings).toEqual([])
  })

  it('does not turn a tangent touch on a wedge edge into a visit', () => {
    const result = scanBoundaryCrossings(
      wedge,
      [0, 0.5, 1],
      (timeSeconds) => {
        const angle = 0.2 + (timeSeconds - 0.5) ** 2
        return point(
          timeSeconds,
          10 * Math.cos(angle),
          10 * Math.sin(angle),
        )
      },
    )

    expect(result.crossings).toEqual([])
  })

  it('collapses a centre passage to one wedge transition', () => {
    const result = scanBoundaryCrossings(
      wedge,
      [0, 0.5, 1],
      (timeSeconds) => point(timeSeconds, -1 + timeSeconds * 2, 0),
    )

    expect(result.diagnostics).toEqual([])
    expect(result.crossings).toHaveLength(1)
    expect(result.crossings[0]).toMatchObject({
      timeSeconds: 0.5,
      position: { x: 0, y: 0 },
    })
  })

  it('accepts a spoke crossing ahead of its origin and rejects the line behind', () => {
    const verticalPath = (x: number) => (timeSeconds: number) =>
      point(timeSeconds, x, -1 + timeSeconds * 2)

    expect(
      scanBoundaryCrossings(spoke, [0, 1], verticalPath(2)).crossings,
    ).toMatchObject([{ timeSeconds: 0.5, position: { x: 2, y: 0 } }])
    expect(
      scanBoundaryCrossings(spoke, [0, 1], verticalPath(-2)).crossings,
    ).toEqual([])
  })

  it('converges across coarse and fine grids within the documented tolerance', () => {
    const evaluate = (timeSeconds: number) =>
      point(timeSeconds, 2, timeSeconds ** 2 - 0.5)
    const coarse = scanBoundaryCrossings(spoke, [0, 1], evaluate)
    const fine = scanBoundaryCrossings(
      spoke,
      Array.from({ length: 11 }, (_, index) => index / 10),
      evaluate,
    )
    const expected = Math.sqrt(0.5)

    expect(coarse.crossings[0].timeSeconds).toBeCloseTo(expected, 6)
    expect(fine.crossings[0].timeSeconds).toBeCloseTo(expected, 6)
    expect(
      Math.abs(
        coarse.crossings[0].timeSeconds - fine.crossings[0].timeSeconds,
      ),
    ).toBeLessThan(1e-7)
  })

  it('diagnoses refinement limits and Boundary overlap', () => {
    const limited = scanBoundaryCrossings(
      spoke,
      [0, 1],
      (timeSeconds) => point(timeSeconds, 2, timeSeconds - 0.1234),
      { maxIterations: 1, timeToleranceSeconds: 1e-12 },
    )
    const overlap = scanBoundaryCrossings(
      spoke,
      [0, 0.5, 1],
      (timeSeconds) => point(timeSeconds, 1 + timeSeconds, 0),
    )

    expect(limited.crossings[0].converged).toBe(false)
    expect(limited.diagnostics).toMatchObject([
      { code: 'refinement-limit', boundaryId: 'spoke-1' },
    ])
    expect(overlap.crossings).toEqual([])
    expect(overlap.diagnostics).toMatchObject([
      { code: 'boundary-overlap', boundaryId: 'spoke-1' },
    ])
  })

  it('requires a finite, strictly increasing time grid', () => {
    const evaluate = (timeSeconds: number) => point(timeSeconds, 2, 0)

    expect(() => scanBoundaryCrossings(spoke, [0], evaluate)).toThrow(
      'at least two',
    )
    expect(() => scanBoundaryCrossings(spoke, [0, 0], evaluate)).toThrow(
      'strictly increasing',
    )
    expect(() =>
      scanBoundaryCrossings(spoke, [0, Number.NaN], evaluate),
    ).toThrow('finite')
  })
})
