import { describe, expect, it } from 'vitest'

import type { Composition, HeadSpec } from './composition'
import { defaultComposition } from './defaultComposition'
import { headStateAt, headStatesAt } from './heads'

const cloneDefault = (): Composition => structuredClone(defaultComposition)

const secondHead = (composition: Composition): HeadSpec => ({
  ...structuredClone(composition.wheels[0].heads[0]),
  id: 'head-2',
  name: 'Head 2',
  phaseOffset: 0.25,
  attachment: { kind: 'spirogram', penOffset: 60 },
})

describe('Head state', () => {
  it('shares Wheel phase while preserving independent Head phase and attachment', () => {
    const composition = cloneDefault()
    composition.wheels[0].heads.push(secondHead(composition))

    const states = headStatesAt(composition, 'wheel-1', 0.5)

    expect(states).toHaveLength(2)
    expect(states[0].wheelPhase).toBe(states[1].wheelPhase)
    expect(states[0].headPhase).toBe(0.25)
    expect(states[1].headPhase).toBe(0.5)
    expect(states[0].position).not.toEqual(states[1].position)
    expect(states.map((state) => state.subjectIds)).toEqual([
      ['wheel-1', 'head-1'],
      ['wheel-1', 'head-2'],
    ])
  })

  it('reports position, velocity, speed, angle, and radius', () => {
    const state = headStateAt(cloneDefault(), 'head-1', 0.75)

    expect(Number.isFinite(state.position.x)).toBe(true)
    expect(Number.isFinite(state.position.y)).toBe(true)
    expect(Number.isFinite(state.velocity.x)).toBe(true)
    expect(Number.isFinite(state.velocity.y)).toBe(true)
    expect(state.speed).toBe(Math.hypot(state.velocity.x, state.velocity.y))
    expect(Number.isFinite(state.angle)).toBe(true)
    expect(state.radius).toBeGreaterThanOrEqual(0)
  })

  it('applies Wheel center and Head offset in shared Space', () => {
    const base = cloneDefault()
    const shifted = cloneDefault()
    shifted.wheels[0].center = { x: 10, y: -5 }
    shifted.wheels[0].heads[0].offset = { x: 3, y: 4 }

    const baseState = headStateAt(base, 'head-1', 0.25)
    const shiftedState = headStateAt(shifted, 'head-1', 0.25)

    expect(shiftedState.position.x - baseState.position.x).toBeCloseTo(13, 12)
    expect(shiftedState.position.y - baseState.position.y).toBeCloseTo(-1, 12)
  })

  it('reverses traversal and velocity without changing identity', () => {
    const forward = cloneDefault()
    const reverse = cloneDefault()
    reverse.wheels[0].direction = 'reverse'

    const forwardState = headStateAt(forward, 'head-1', 0)
    const reverseState = headStateAt(reverse, 'head-1', 0)

    expect(reverseState.subjectIds).toEqual(forwardState.subjectIds)
    expect(reverseState.position).toEqual(forwardState.position)
    expect(reverseState.velocity.x).toBeCloseTo(-forwardState.velocity.x, 5)
    expect(reverseState.velocity.y).toBeCloseTo(-forwardState.velocity.y, 5)
  })

  it('continues a damped trajectory past phase wrap without forced closure', () => {
    const composition = cloneDefault()
    composition.wheels[0].motion = {
      kind: 'harmonograph',
      frequencyX: 3.01,
      frequencyY: 2,
      delta: Math.PI / 2,
      damping: 0.04,
      amplitudeX: 150,
      amplitudeY: 120,
    }
    composition.wheels[0].heads[0].attachment = {
      kind: 'harmonograph',
      amplitudeScale: 1,
      phaseX: 0,
      phaseY: 0,
    }

    const start = headStateAt(composition, 'head-1', 0)
    const afterOneCycle = headStateAt(composition, 'head-1', 2)
    const afterTwoCycles = headStateAt(composition, 'head-1', 4)

    expect(start.wheelPhase).toBe(0)
    expect(afterOneCycle.wheelPhase).toBe(0)
    expect(afterTwoCycles.wheelPhase).toBe(0)
    expect(afterOneCycle.position).not.toEqual(start.position)
    expect(afterTwoCycles.position).not.toEqual(afterOneCycle.position)
    expect(afterTwoCycles.radius).toBeLessThan(afterOneCycle.radius)
  })

  it('depends only on Composition and requested time', () => {
    const composition = cloneDefault()
    const first = headStateAt(composition, 'head-1', 0.123456)

    expect(headStateAt(composition, 'head-1', 0.123456)).toEqual(first)
  })

  it('rejects a missing Head', () => {
    expect(() => headStateAt(cloneDefault(), 'missing', 0)).toThrow(
      'Unknown Head "missing"',
    )
  })
})
