import { describe, expect, it } from 'vitest'

import { mapStrengthToVelocity, quantizeAbsoluteBeat } from './rhythm'

describe('Transport-beat rhythm adapters', () => {
  it('quantizes absolute beats rather than normalized curve positions', () => {
    expect(quantizeAbsoluteBeat(9.3, { gridBeats: 0.5, strength: 1 })).toBe(9.5)
    expect(quantizeAbsoluteBeat(9.3, { gridBeats: 0.5, strength: 0.5 })).toBe(9.4)
    expect(quantizeAbsoluteBeat(9.3, { gridBeats: 0.5, strength: 0 })).toBe(9.3)
  })

  it('maps constant and Encounter-strength velocity contracts', () => {
    expect(mapStrengthToVelocity(0.8, { kind: 'constant', value: 72 })).toBe(72)
    expect(
      mapStrengthToVelocity(0.5, {
        kind: 'encounter-strength',
        min: 20,
        max: 100,
        gamma: 1,
      }),
    ).toBe(60)
  })
})
