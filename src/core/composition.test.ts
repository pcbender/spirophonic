import { describe, expect, it } from 'vitest'

import { compositionVersion } from './composition'
import { defaultComposition } from './defaultComposition'

describe('the v1 Composition model', () => {
  it('starts with the minimal relationship-first object graph', () => {
    expect(defaultComposition.version).toBe(compositionVersion)
    expect(defaultComposition.wheels).toHaveLength(1)
    expect(defaultComposition.wheels[0].heads).toHaveLength(1)
    expect(defaultComposition.fields).toEqual([])
    expect(defaultComposition.parts).toEqual([])
    expect(defaultComposition.instruments).toHaveLength(1)
    expect(defaultComposition.instruments[0].kind).toBe('native-synth')
  })

  it('keeps shared Wheel motion separate from its Head attachment', () => {
    const wheel = defaultComposition.wheels[0]
    const head = wheel.heads[0]

    expect(wheel.motion).toEqual({
      kind: 'spirogram',
      fixedRadius: 180,
      movingRadius: 65,
      rotation: 'inside',
    })
    expect(head.attachment).toEqual({
      kind: 'spirogram',
      penOffset: 95,
    })
    expect(wheel.rate).toEqual({ cycles: 1, beats: 4 })
  })
})
