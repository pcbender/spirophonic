import { describe, expect, it } from 'vitest'

import type { Composition, RingBoundarySpec } from './composition'
import {
  concurrentWheelsComposition,
  ringAndSpokeComposition,
} from '../test/fixtures/compositions'
import { compilePerformance } from './performance'

/**
 * Release budgets for Encounter detection.
 *
 * Encounter compilation is the hot path: it scans every enabled Head against
 * every enabled Boundary across the window, then refines each sign change. The
 * budgets below fix what that produces, and the scaling checks fix how the cost
 * grows, so a change from linear to quadratic in Heads or Boundaries fails here
 * rather than being discovered as a slow editor.
 */

const window8s = { startSeconds: 0, durationSeconds: 8, sampleRateHz: 240 }

/** A rings Field with `count` evenly spaced Boundaries, replacing the first. */
const withRingCount = (count: number): Composition => {
  const composition = concurrentWheelsComposition()
  const rings = composition.fields.find((field) => field.kind === 'rings')
  if (!rings) throw new Error('fixture lost its rings Field')
  rings.boundaries = Array.from({ length: count }, (_value, index) => ({
    id: `ring-${index + 1}`,
    name: `Ring ${index + 1}`,
    enabled: true,
    index,
    kind: 'ring' as const,
    radius: 70 + index * 30,
  })) satisfies Array<RingBoundarySpec>
  return composition
}

const headCountOf = (composition: Composition) =>
  composition.wheels.reduce((total, wheel) => total + wheel.heads.length, 0)

describe('Encounter detection budgets', () => {
  it('holds the checked-in Encounter count for each reference shape', () => {
    expect(
      compilePerformance(ringAndSpokeComposition(), window8s).encounters.length,
    ).toBe(53)
    expect(
      compilePerformance(concurrentWheelsComposition(), window8s).encounters
        .length,
    ).toBe(749)
  })

  it('grows about linearly in the number of Boundaries', () => {
    const counts = [2, 4, 8].map(
      (rings) => compilePerformance(withRingCount(rings), window8s).encounters.length,
    )

    // Each added ring is another set of crossings, not another pass over the
    // ones already there.
    expect(counts[0]).toBeGreaterThan(0)
    const perRing = counts.map((count, index) => count / [2, 4, 8][index])
    for (const rate of perRing.slice(1)) {
      expect(rate).toBeGreaterThan(perRing[0] * 0.4)
      expect(rate).toBeLessThan(perRing[0] * 2.5)
    }
  })

  it('grows about linearly in the number of Heads', () => {
    const oneWheel = concurrentWheelsComposition()
    oneWheel.wheels = [oneWheel.wheels[0]]
    for (const part of oneWheel.parts) {
      if (part.encounterQuery.wheelIds.length > 0) {
        part.encounterQuery.wheelIds = ['wheel-1']
      }
    }

    const all = concurrentWheelsComposition()
    const smallCount = compilePerformance(oneWheel, window8s).encounters.length
    const largeCount = compilePerformance(all, window8s).encounters.length
    const headRatio = headCountOf(all) / headCountOf(oneWheel)
    const workRatio = largeCount / smallCount

    expect(smallCount).toBeGreaterThan(0)
    // Four times the Heads should be near four times the work, not sixteen.
    expect(workRatio).toBeLessThan(headRatio * 1.6)
  })

  it('detects the same crossings from a seek as from a whole window', () => {
    const whole = compilePerformance(concurrentWheelsComposition(), window8s)
    const secondHalf = compilePerformance(concurrentWheelsComposition(), {
      ...window8s,
      startSeconds: 4,
      durationSeconds: 4,
    })

    const wholeLate = whole.encounters
      .filter((encounter) => encounter.timeSeconds > 4.0001)
      .map((encounter) => encounter.id)
    const seeked = secondHalf.encounters
      .filter((encounter) => encounter.timeSeconds > 4.0001)
      .map((encounter) => encounter.id)

    expect(seeked).toEqual(wholeLate)
  })

  it('reports truncation rather than silently dropping Encounters', () => {
    // The cap exists so a pathological Composition cannot hang the editor, and
    // it has to be visible when it engages or a user sees missing notes with
    // no explanation. The cap is lowered here rather than built up to: a
    // Composition dense enough to reach 10,000 naturally takes ~14s to compile,
    // which would make this benchmark the slowest thing in the suite while
    // testing exactly the same branch.
    const compiled = compilePerformance(
      concurrentWheelsComposition(),
      window8s,
      { maxEncounters: 100 },
    )

    expect(compiled.encounters.length).toBeLessThanOrEqual(100)
    expect(
      compiled.diagnostics.some((diagnostic) =>
        diagnostic.message.includes('maximum'),
      ),
      `diagnostics: ${compiled.diagnostics.map((d) => d.message).join(' | ')}`,
    ).toBe(true)
  })
})
