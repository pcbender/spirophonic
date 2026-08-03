import { describe, expect, it } from 'vitest'

import { curveFamilies, generateCurvePoints } from './curves'
import { defaultModel } from './defaultModel'
import { extractEvents } from './events'
import type { CurveFamily, SpirophonicModel } from './model'
import { generateSpiroPoints } from './trochoid'

const withFamily = (
  family: CurveFamily,
  geometry: Partial<SpirophonicModel['geometry']> = {},
): SpirophonicModel => ({
  ...defaultModel,
  geometry: { ...defaultModel.geometry, family, ...geometry },
})

describe('generateCurvePoints', () => {
  it('leaves the spirogram to the original engine', () => {
    expect(generateCurvePoints(defaultModel)).toEqual(generateSpiroPoints(defaultModel))
  })

  it('closes every family exactly', () => {
    for (const family of curveFamilies) {
      const points = generateCurvePoints(withFamily(family))
      const first = points[0]
      const last = points[points.length - 1]

      expect(Math.hypot(last.x - first.x, last.y - first.y)).toBeLessThan(1e-9)
    }
  })

  it('produces a usable number of samples for every family', () => {
    for (const family of curveFamilies) {
      expect(generateCurvePoints(withFamily(family)).length).toBeGreaterThan(100)
    }
  })

  it('fits the unit families to the fixed radius', () => {
    const unitFamilies = curveFamilies.filter((family) => family !== 'spirogram')

    for (const family of unitFamilies) {
      const points = generateCurvePoints(withFamily(family))
      const reach = points.reduce((max, point) => Math.max(max, point.radius), 0)

      expect(reach).toBeCloseTo(defaultModel.geometry.fixedRadius, 6)
    }
  })

  it('leaves the spirogram at its own pixel scale', () => {
    // The spirogram reaches radiusDelta + penOffset, past the fixed radius, and
    // is passed through untouched so its golden fixtures stay valid.
    const points = generateCurvePoints(defaultModel)
    const reach = points.reduce((max, point) => Math.max(max, point.radius), 0)

    expect(reach).toBeCloseTo(210, 6)
  })

  it('reports finite coordinates for a superformula with fractional exponents', () => {
    for (const point of generateCurvePoints(withFamily('superformula'))) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }
  })

  it('produces identical output for identical input', () => {
    for (const family of curveFamilies) {
      const model = withFamily(family)

      expect(generateCurvePoints(model)).toEqual(generateCurvePoints(model))
    }
  })
})

describe('curve families as rhythm', () => {
  it('reads a lissajous ratio as a polyrhythm', () => {
    const points = generateCurvePoints(
      withFamily('lissajous', { lissFreqX: 3, lissFreqY: 2 }),
    )

    expect(extractEvents(points, { source: 'zero-x' })).toHaveLength(3)
    expect(extractEvents(points, { source: 'zero-y' })).toHaveLength(2)
  })

  it('follows the lissajous ratio when it changes', () => {
    const points = generateCurvePoints(
      withFamily('lissajous', { lissFreqX: 5, lissFreqY: 4 }),
    )

    expect(extractEvents(points, { source: 'zero-x' })).toHaveLength(5)
    expect(extractEvents(points, { source: 'zero-y' })).toHaveLength(4)
  })

  it('gives one radial maximum per rose petal', () => {
    const points = generateCurvePoints(withFamily('rose', { roseN: 5, roseD: 1 }))

    expect(extractEvents(points, { source: 'radius-max' })).toHaveLength(5)
  })

  it('doubles the petals of an even rose', () => {
    const points = generateCurvePoints(withFamily('rose', { roseN: 4, roseD: 1 }))

    expect(extractEvents(points, { source: 'radius-max' })).toHaveLength(8)
  })

  it('swells and fades across a harmonograph', () => {
    // Closing the damped curve by retracing it makes the bar symmetric in
    // time: it decays into the middle and recovers out of it. That is the
    // shape worth having for an ambient part, so it is pinned here.
    const points = generateCurvePoints(withFamily('harmonograph'))
    const events = extractEvents(points, { source: 'radius-max' })
    const middle = events.reduce((closest, event) =>
      Math.abs(event.t - 0.5) < Math.abs(closest.t - 0.5) ? event : closest,
    )

    expect(events.length).toBeGreaterThan(2)
    expect(events[0].strength).toBeGreaterThan(middle.strength)
    expect(events[events.length - 1].strength).toBeGreaterThan(middle.strength)
  })
})
