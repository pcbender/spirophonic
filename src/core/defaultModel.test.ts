import { describe, expect, it } from 'vitest'
import { defaultModel } from './defaultModel'

describe('defaultModel', () => {
  it('is a valid v0.1 relationship model with conservative audio defaults', () => {
    expect(defaultModel.version).toBe('0.1')
    expect(defaultModel.geometry.samples).toBeGreaterThanOrEqual(120)
    expect(defaultModel.time.cyclesPerSecond).toBeGreaterThan(0)
    expect(defaultModel.sound.enabled).toBe(false)
    expect(defaultModel.sound.minFrequencyHz).toBeLessThan(
      defaultModel.sound.maxFrequencyHz,
    )
    expect(defaultModel.color.saturation).toBeGreaterThanOrEqual(0)
    expect(defaultModel.color.saturation).toBeLessThanOrEqual(100)
    expect(defaultModel.color.lightness).toBeGreaterThanOrEqual(0)
    expect(defaultModel.color.lightness).toBeLessThanOrEqual(100)
  })
})

