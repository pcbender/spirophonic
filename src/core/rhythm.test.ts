import { describe, expect, it } from 'vitest'

import type { CurveEvent } from './events'
import {
  applyVelocity,
  defaultVelocityOptions,
  quantizeEvents,
  shapeRhythm,
} from './rhythm'

const event = (t: number, strength = 0.5): CurveEvent => ({
  t,
  strength,
  source: 'zero-y',
  index: 0,
})

describe('quantizeEvents', () => {
  it('leaves timing alone at zero strength', () => {
    const events = [event(0.13), event(0.42), event(0.87)]
    const quantized = quantizeEvents(events, { divisions: 16, strength: 0 })

    expect(quantized.map((item) => item.t)).toEqual([0.13, 0.42, 0.87])
  })

  it('lands every onset on the grid at full strength', () => {
    const events = [event(0.13), event(0.42), event(0.87)]
    const quantized = quantizeEvents(events, { divisions: 16, strength: 1 })

    for (const item of quantized) {
      expect(Number.isInteger(Math.round(item.t * 16 * 1e9) / 1e9)).toBe(true)
      expect(item.t * 16).toBeCloseTo(Math.round(item.t * 16), 9)
    }
  })

  it('moves partway toward the grid at partial strength', () => {
    const [moved] = quantizeEvents([event(0.13)], { divisions: 16, strength: 0.5 })

    // 0.13 snaps to 0.125, so half the correction lands at 0.1275.
    expect(moved.t).toBeCloseTo(0.1275, 9)
  })

  it('wraps an onset that snaps to the end of the cycle', () => {
    const [moved] = quantizeEvents([event(0.99)], { divisions: 4, strength: 1 })

    expect(moved.t).toBe(0)
  })

  it('keeps the strongest of two onsets sharing a slot', () => {
    const events = [event(0.26, 0.2), event(0.24, 0.9)]
    const quantized = quantizeEvents(events, { divisions: 4, strength: 1 })

    expect(quantized).toHaveLength(1)
    expect(quantized[0].strength).toBe(0.9)
    expect(quantized[0].t).toBeCloseTo(0.25, 9)
  })

  it('keeps a near miss as a separate onset below full strength', () => {
    const events = [event(0.26, 0.2), event(0.24, 0.9)]

    expect(quantizeEvents(events, { divisions: 4, strength: 0 })).toHaveLength(2)
  })

  it('returns onsets in ascending order', () => {
    const events = [event(0.8), event(0.1), event(0.5)]
    const times = quantizeEvents(events, { divisions: 8, strength: 1 }).map(
      (item) => item.t,
    )

    expect(times).toEqual([...times].sort((left, right) => left - right))
  })

  it('keeps every onset inside one cycle', () => {
    const events = [event(0.97), event(0.99), event(0.02)]

    for (const item of quantizeEvents(events, { divisions: 8, strength: 1 })) {
      expect(item.t).toBeGreaterThanOrEqual(0)
      expect(item.t).toBeLessThan(1)
    }
  })
})

describe('applyVelocity', () => {
  it('maps strength across the velocity range', () => {
    const shaped = applyVelocity(
      [event(0, 0), event(0.5, 0.5), event(0.75, 1)],
      { min: 40, max: 120, gamma: 1 },
    )

    expect(shaped.map((item) => item.velocity)).toEqual([40, 80, 120])
  })

  it('bends response with gamma', () => {
    const [soft] = applyVelocity([event(0, 0.5)], { min: 8, max: 108, gamma: 2 })

    expect(soft.velocity).toBe(33)
  })

  it('keeps velocities inside the MIDI range', () => {
    const shaped = applyVelocity(
      [event(0, 0), event(0.5, 1)],
      { min: -20, max: 400, gamma: 1 },
    )

    for (const item of shaped) {
      expect(item.velocity).toBeGreaterThanOrEqual(1)
      expect(item.velocity).toBeLessThanOrEqual(127)
      expect(Number.isInteger(item.velocity)).toBe(true)
    }
  })

  it('tolerates a reversed range', () => {
    const [shaped] = applyVelocity([event(0, 1)], { min: 120, max: 40, gamma: 1 })

    expect(shaped.velocity).toBe(120)
  })
})

describe('shapeRhythm', () => {
  it('quantizes and voices in one pass', () => {
    const shaped = shapeRhythm([event(0.13, 1), event(0.62, 0)], {
      quantize: { divisions: 8, strength: 1 },
      velocity: defaultVelocityOptions,
    })

    expect(shaped.map((item) => item.t)).toEqual([0.125, 0.625])
    expect(shaped.map((item) => item.velocity)).toEqual([118, 48])
  })

  it('produces identical output for identical input', () => {
    const events = [event(0.13, 0.4), event(0.62, 0.8)]
    const options = {
      quantize: { divisions: 16, strength: 0.5 },
      velocity: defaultVelocityOptions,
    }

    expect(shapeRhythm(events, options)).toEqual(shapeRhythm(events, options))
  })
})
