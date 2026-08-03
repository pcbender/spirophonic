import { describe, expect, it } from 'vitest'

import { cycleDistance, extractEvents, normalize, wrapCycle } from './events'
import { defaultModel } from './defaultModel'
import { generateSpiroPoints, type SpiroPoint } from './trochoid'

/**
 * Samples a closed parametric curve the way generateSpiroPoints does, so these
 * tests describe the shapes the curve families will produce in P5 without
 * depending on that packet.
 */
const buildPoints = (
  end: number,
  count: number,
  at: (theta: number) => [number, number],
): Array<SpiroPoint> => {
  const points = Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const [x, y] = at(progress * end)

    return {
      t: progress,
      x,
      y,
      radius: Math.hypot(x, y),
      angle: Math.atan2(y, x),
    }
  })

  points[points.length - 1] = { ...points[0], t: 1 }

  return points
}

// x = sin(a*theta + delta), y = sin(b*theta), closing at TAU / gcd(a, b).
const lissajous = (a: number, b: number, delta = Math.PI / 2) =>
  buildPoints(Math.PI * 2, 900, (theta) => [
    Math.sin(a * theta + delta),
    Math.sin(b * theta),
  ])

// r = cos((n/d) * theta), closing at pi*d when n*d is odd.
const rose = (n: number, d: number) =>
  buildPoints(Math.PI * d, 900, (theta) => {
    const radius = Math.cos((n / d) * theta)

    return [radius * Math.cos(theta), radius * Math.sin(theta)]
  })

// gcd(180, 60) is 60, so the curve closes after exactly one turn.
const circlePoints = () =>
  generateSpiroPoints({
    ...defaultModel,
    geometry: {
      ...defaultModel.geometry,
      fixedRadius: 180,
      movingRadius: 60,
      penOffset: 0,
    },
  })

describe('extractEvents', () => {
  it('finds one rising crossing per turn of a circle', () => {
    const events = extractEvents(circlePoints(), { source: 'zero-y' })

    expect(events).toHaveLength(1)
    expect(events[0].t).toBeCloseTo(0, 6)
  })

  it('finds no curvature peaks on a curve of constant curvature', () => {
    const events = extractEvents(circlePoints(), { source: 'curvature' })

    expect(events).toEqual([])
  })

  it('reads a lissajous frequency ratio as a polyrhythm', () => {
    const points = lissajous(3, 2)

    expect(extractEvents(points, { source: 'zero-x' })).toHaveLength(3)
    expect(extractEvents(points, { source: 'zero-y' })).toHaveLength(2)
  })

  it('counts both crossing directions', () => {
    const points = lissajous(3, 2)
    const events = extractEvents(points, { source: 'zero-y', direction: 'both' })

    expect(events).toHaveLength(4)
  })

  it('finds one radial maximum per petal of a rose', () => {
    const events = extractEvents(rose(5, 1), { source: 'radius-max' })

    expect(events).toHaveLength(5)
  })

  it('finds a petal tip sitting on the cycle seam', () => {
    // cos(0) is a maximum, so a rose peaks at t = 0. Missing it would leave
    // four events on a five-petal curve.
    const events = extractEvents(rose(5, 1), { source: 'radius-max' })

    expect(events[0].t).toBeCloseTo(0, 6)
  })

  it('finds radial minima between petals', () => {
    const events = extractEvents(rose(5, 1), { source: 'radius-min' })

    expect(events).toHaveLength(5)
  })

  it('keeps every event inside one cycle', () => {
    const events = extractEvents(lissajous(5, 4), { source: 'zero-x', direction: 'both' })

    expect(events.length).toBeGreaterThan(0)

    for (const event of events) {
      expect(event.t).toBeGreaterThanOrEqual(0)
      expect(event.t).toBeLessThan(1)
    }
  })

  it('returns events in ascending cycle order', () => {
    const events = extractEvents(rose(7, 1), { source: 'radius-max' })
    const times = events.map((event) => event.t)

    expect(times).toEqual([...times].sort((left, right) => left - right))
  })

  it('honors the minimum separation between events', () => {
    const events = extractEvents(rose(9, 1), {
      source: 'radius-max',
      minSeparation: 0.2,
    })

    for (let index = 1; index < events.length; index += 1) {
      expect(cycleDistance(events[index - 1].t, events[index].t)).toBeGreaterThanOrEqual(
        0.2,
      )
    }
  })

  it('keeps the strongest events when capped', () => {
    const points = lissajous(9, 8)
    const all = extractEvents(points, { source: 'curvature', threshold: 0 })
    const capped = extractEvents(points, { source: 'curvature', threshold: 0, maxEvents: 3 })
    const strongest = [...all]
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 3)
      .map((event) => event.t)
      .sort((left, right) => left - right)

    expect(capped).toHaveLength(3)
    expect(capped.map((event) => event.t)).toEqual(strongest)
  })

  it('reports strengths inside the unit range', () => {
    const events = extractEvents(rose(5, 1), { source: 'radius-max' })

    for (const event of events) {
      expect(event.strength).toBeGreaterThanOrEqual(0)
      expect(event.strength).toBeLessThanOrEqual(1)
    }
  })

  it('produces identical output for identical input', () => {
    const points = lissajous(3, 2)

    expect(extractEvents(points, { source: 'zero-x' })).toEqual(
      extractEvents(points, { source: 'zero-x' }),
    )
  })

  it('returns nothing for a degenerate curve', () => {
    expect(extractEvents([], { source: 'zero-x' })).toEqual([])
  })
})

describe('normalize', () => {
  it('maps a varying field onto the unit range', () => {
    expect(normalize([2, 4, 6])).toEqual([0, 0.5, 1])
  })

  it('collapses a constant field to the middle', () => {
    expect(normalize([120, 120, 120])).toEqual([0.5, 0.5, 0.5])
  })

  it('treats float residue on a constant field as constant', () => {
    expect(normalize([120, 120 + 1e-12, 120 - 1e-12])).toEqual([0.5, 0.5, 0.5])
  })
})

describe('cycle helpers', () => {
  it('wraps positions into one cycle', () => {
    expect(wrapCycle(1)).toBe(0)
    expect(wrapCycle(1.25)).toBeCloseTo(0.25, 12)
    expect(wrapCycle(-0.25)).toBeCloseTo(0.75, 12)
  })

  it('measures the shorter way around the cycle', () => {
    expect(cycleDistance(0.1, 0.2)).toBeCloseTo(0.1, 12)
    expect(cycleDistance(0.95, 0.05)).toBeCloseTo(0.1, 12)
  })
})
