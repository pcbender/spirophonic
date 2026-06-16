import { describe, expect, it } from 'vitest'
import { formatCycleSetting, getEffectiveCyclesPerSecond } from './time'

describe('cycle timing helpers', () => {
  it('clamps speed to the supported cps range', () => {
    expect(getEffectiveCyclesPerSecond(0)).toBe(0.01)
    expect(getEffectiveCyclesPerSecond(5)).toBe(2)
  })

  it('formats cps with human loop duration', () => {
    expect(getEffectiveCyclesPerSecond(2)).toBe(2)
    expect(formatCycleSetting(2)).toBe('2.00 cps (0.5s loop)')
    expect(formatCycleSetting(0.01)).toBe('0.01 cps (100.0s loop)')
  })
})
