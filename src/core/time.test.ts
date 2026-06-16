import { describe, expect, it } from 'vitest'
import { formatCycleSetting, getEffectiveCyclesPerSecond } from './time'

describe('cycle timing helpers', () => {
  it('treats negative values as seconds per loop', () => {
    expect(getEffectiveCyclesPerSecond(-5)).toBe(0.2)
    expect(formatCycleSetting(-5)).toBe('5.0s loop')
  })

  it('treats positive values as cycles per second', () => {
    expect(getEffectiveCyclesPerSecond(2)).toBe(2)
    expect(formatCycleSetting(2)).toBe('2.00 cps')
  })
})

