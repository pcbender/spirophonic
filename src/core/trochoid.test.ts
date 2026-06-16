import { describe, expect, it } from 'vitest'
import { defaultModel } from './defaultModel'
import { generateSpiroPoints } from './trochoid'

describe('generateSpiroPoints', () => {
  it('returns the requested point count', () => {
    const points = generateSpiroPoints(defaultModel)

    expect(points).toHaveLength(defaultModel.geometry.samples)
  })

  it('returns deterministic output for the same model', () => {
    const first = generateSpiroPoints(defaultModel)
    const second = generateSpiroPoints(defaultModel)

    expect(second).toEqual(first)
  })

  it('produces different traces for inside and outside rotation', () => {
    const inside = generateSpiroPoints({
      ...defaultModel,
      geometry: { ...defaultModel.geometry, rotation: 'inside' },
    })
    const outside = generateSpiroPoints({
      ...defaultModel,
      geometry: { ...defaultModel.geometry, rotation: 'outside' },
    })

    expect(outside[1]).not.toEqual(inside[1])
  })

  it('changes output when phase changes', () => {
    const base = generateSpiroPoints(defaultModel)
    const shifted = generateSpiroPoints({
      ...defaultModel,
      geometry: { ...defaultModel.geometry, phase: Math.PI / 3 },
    })

    expect(shifted[0]).not.toEqual(base[0])
  })
})
