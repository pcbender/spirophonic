import { describe, expect, it } from 'vitest'

import type { HeadAttachmentSpec, MotionSpec } from './composition'
import { motionPointAt } from './motion'

const cases: Array<{
  motion: MotionSpec
  attachment: HeadAttachmentSpec
}> = [
  {
    motion: {
      kind: 'spirogram',
      fixedRadius: 180,
      movingRadius: 65,
      rotation: 'inside',
    },
    attachment: { kind: 'spirogram', penOffset: 95 },
  },
  {
    motion: { kind: 'lissajous', frequencyX: 3, frequencyY: 2, delta: 0.4 },
    attachment: {
      kind: 'lissajous',
      scaleX: 2,
      scaleY: 3,
      phaseX: 0.1,
      phaseY: 0.2,
    },
  },
  {
    motion: { kind: 'rose', numerator: 5, denominator: 2 },
    attachment: { kind: 'rose', radiusScale: 120, angularOffset: 0.3 },
  },
  {
    motion: {
      kind: 'superformula',
      symmetry: 6,
      n1: 0.3,
      n2: 0.3,
      n3: 0.3,
    },
    attachment: {
      kind: 'superformula',
      radiusScale: 140,
      angularOffset: 0.2,
    },
  },
  {
    motion: {
      kind: 'harmonograph',
      frequencyX: 3.01,
      frequencyY: 2,
      delta: Math.PI / 2,
      damping: 0.02,
      amplitudeX: 150,
      amplitudeY: 120,
    },
    attachment: {
      kind: 'harmonograph',
      amplitudeScale: 0.8,
      phaseX: 0.1,
      phaseY: 0.2,
    },
  },
]

describe('motionPointAt', () => {
  it.each(cases)('evaluates $motion.kind deterministically', ({
    motion,
    attachment,
  }) => {
    const first = motionPointAt(motion, attachment, 1.25, 1.25)

    expect(motionPointAt(motion, attachment, 1.25, 1.25)).toEqual(first)
    expect(Number.isFinite(first.position.x)).toBe(true)
    expect(Number.isFinite(first.position.y)).toBe(true)
  })

  it('keeps unwrapped cycle position for damped motion', () => {
    const { motion, attachment } = cases[4]
    const firstCycle = motionPointAt(motion, attachment, 1, 1)
    const secondCycle = motionPointAt(motion, attachment, 2, 2)

    expect(firstCycle.cyclePosition).toBe(1)
    expect(secondCycle.cyclePosition).toBe(2)
    expect(secondCycle.position).not.toEqual(firstCycle.position)
    expect(Math.hypot(secondCycle.position.x, secondCycle.position.y))
      .toBeLessThan(Math.hypot(firstCycle.position.x, firstCycle.position.y))
  })

  it('rejects a mismatched family at the motion boundary', () => {
    expect(() =>
      motionPointAt(
        cases[0].motion,
        cases[1].attachment,
        0,
        0,
      ),
    ).toThrow('does not match')
  })
})
