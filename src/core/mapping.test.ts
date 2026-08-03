import { describe, expect, it } from 'vitest'
import { defaultModel } from './defaultModel'
import {
  approximateCurvature,
  approximateVelocity,
  clamp,
  mapRange,
  normalize,
  pointToFrequency,
  pointToHue,
  pointToPan,
} from './mapping'
import { generateSpiroPoints } from './trochoid'

describe('mapping utilities', () => {
  const points = generateSpiroPoints(defaultModel)

  it('clamps values to a range', () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-2, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
  })

  it('normalizes and maps ranges', () => {
    expect(normalize(5, 0, 10)).toBe(0.5)
    expect(mapRange(5, 0, 10, 100, 200)).toBe(150)
  })

  it('maps frequency within model min and max Hz', () => {
    const frequency = pointToFrequency(points[10], defaultModel, points)

    expect(frequency).toBeGreaterThanOrEqual(defaultModel.sound.minFrequencyHz)
    expect(frequency).toBeLessThanOrEqual(defaultModel.sound.maxFrequencyHz)
  })

  it('uses base frequency as the pitch anchor for mapped modes', () => {
    const lowBase = pointToFrequency(
      points[120],
      {
        ...defaultModel,
        sound: { ...defaultModel.sound, baseFrequencyHz: 160 },
      },
      points,
    )
    const highBase = pointToFrequency(
      points[120],
      {
        ...defaultModel,
        sound: { ...defaultModel.sound, baseFrequencyHz: 440 },
      },
      points,
    )

    expect(highBase).not.toBe(lowBase)
  })

  it('maps pan to -1 through 1', () => {
    const pan = pointToPan(points[10], points)

    expect(pan).toBeGreaterThanOrEqual(-1)
    expect(pan).toBeLessThanOrEqual(1)
  })

  it('maps hue to 0 through 360', () => {
    const hue = pointToHue(points[10], defaultModel, points, 10)

    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThanOrEqual(360)
  })

  it('approximates velocity as a non-negative value', () => {
    expect(approximateVelocity(points, 10)).toBeGreaterThanOrEqual(0)
  })

  it('reports a gentle bend where the tangent crosses half a turn', () => {
    // A circle bends by the same small amount at every sample. The tangent
    // sweeps through +/-pi once per revolution, which is where an unfolded
    // angle difference used to report a full-circle turn instead.
    const circle = generateSpiroPoints({
      ...defaultModel,
      geometry: {
        ...defaultModel.geometry,
        fixedRadius: 180,
        movingRadius: 60,
        penOffset: 0,
      },
    })
    const curvatures = circle
      .slice(1, -1)
      .map((_, index) => approximateCurvature(circle, index + 1))
    const step = (Math.PI * 2) / (circle.length - 1)

    for (const curvature of curvatures) {
      expect(curvature).toBeCloseTo(step, 9)
    }
  })
})
