import { describe, expect, it } from 'vitest'

import { compositionVersion } from './composition'
import { defaultComposition } from './defaultComposition'

describe('the v1 Composition model', () => {
  it('starts with one complete playable relationship', () => {
    expect(defaultComposition.version).toBe(compositionVersion)
    expect(defaultComposition.wheels).toHaveLength(1)
    expect(defaultComposition.wheels[0].heads).toHaveLength(1)
    expect(defaultComposition.fields.map((field) => field.kind)).toEqual([
      'rings',
      'spokes',
    ])
    expect(defaultComposition.parts).toHaveLength(1)
    expect(defaultComposition.parts[0]).toMatchObject({
      kind: 'note',
      instrumentId: 'instrument-1',
    })
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
