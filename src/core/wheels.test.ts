import { describe, expect, it } from 'vitest'

import type { Composition } from './composition'
import { defaultComposition } from './defaultComposition'
import { wheelStateAt, wheelStatesAt } from './wheels'

const cloneDefault = (): Composition => structuredClone(defaultComposition)

describe('Wheel state', () => {
  it('evaluates shared phase from absolute Transport time', () => {
    expect(wheelStateAt(cloneDefault(), 'wheel-1', 0.5)).toEqual({
      wheelId: 'wheel-1',
      subjectIds: ['wheel-1'],
      timeSeconds: 0.5,
      absoluteBeat: 1,
      elapsedCycles: 0.25,
      cyclePosition: 0.25,
      phase: 0.25,
      direction: 'forward',
      center: { x: 0, y: 0 },
    })
  })

  it('retains unwrapped cycles when normalized phase repeats', () => {
    const state = wheelStateAt(cloneDefault(), 'wheel-1', 4)

    expect(state.elapsedCycles).toBe(2)
    expect(state.cyclePosition).toBe(2)
    expect(state.phase).toBe(0)
  })

  it('reverses traversal while retaining stable identity', () => {
    const composition = cloneDefault()
    composition.wheels[0].direction = 'reverse'

    expect(wheelStateAt(composition, 'wheel-1', 0.5)).toMatchObject({
      wheelId: 'wheel-1',
      subjectIds: ['wheel-1'],
      elapsedCycles: 0.25,
      cyclePosition: -0.25,
      phase: 0.75,
      direction: 'reverse',
    })
  })

  it('preserves configured Wheel order for multi-Wheel evaluation', () => {
    const composition = cloneDefault()
    composition.wheels.push({
      ...structuredClone(composition.wheels[0]),
      id: 'wheel-2',
      name: 'Wheel 2',
      heads: [
        {
          ...structuredClone(composition.wheels[0].heads[0]),
          id: 'head-2',
        },
      ],
    })

    expect(wheelStatesAt(composition, 1).map((state) => state.wheelId)).toEqual([
      'wheel-1',
      'wheel-2',
    ])
  })

  it('depends only on Composition and requested time', () => {
    const composition = cloneDefault()
    const first = wheelStateAt(composition, 'wheel-1', 0.123456)

    expect(wheelStateAt(composition, 'wheel-1', 0.123456)).toEqual(first)
  })

  it('rejects missing Wheels and invalid absolute time', () => {
    expect(() => wheelStateAt(cloneDefault(), 'missing', 0)).toThrow(
      'Unknown Wheel "missing"',
    )
    expect(() => wheelStateAt(cloneDefault(), 'wheel-1', -1)).toThrow(
      'non-negative',
    )
  })
})
