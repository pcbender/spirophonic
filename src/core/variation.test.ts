import { describe, expect, it } from 'vitest'

import type { Composition, NotePartSpec } from './composition'
import { defaultComposition } from './defaultComposition'
import { compilePerformance } from './performance'
import {
  createSequence,
  hashString,
  indexValue,
  randomVersion,
  unitValue,
} from './random'
import {
  applyInitialConditionVariation,
  variationBounds,
  variationVersionWarning,
} from './variation'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

const notePart = (id: string, note: number): NotePartSpec => ({
  id,
  name: id,
  enabled: true,
  mute: false,
  solo: false,
  kind: 'note',
  encounterQuery: {
    kinds: ['boundary-crossing'],
    wheelIds: [],
    headIds: [],
    fieldIds: [],
    boundaryIds: [],
    directions: [],
    minStrength: 0,
  },
  instrumentId: 'instrument-1',
  onset: { kind: 'encounter-time' },
  pitch: { kind: 'boundary-degree', root: note, scale: 'major', octaves: 2 },
  velocity: { kind: 'encounter-strength', min: 40, max: 120, gamma: 1 },
  duration: { kind: 'fixed', beats: 0.5 },
})

const varied = (seed: string): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.parts = [notePart('part-a', 48)]
  composition.variation = {
    enabled: true,
    seed,
    version: randomVersion,
    initialConditions: { enabled: true, amount: 1 },
    interpretation: { enabled: true, amount: 0.5 },
    performance: { enabled: true, amount: 1 },
  }
  return composition
}

describe('seeded randomness', () => {
  it('hashes strings stably and independently of insertion order', () => {
    expect(hashString('spirophonic')).toBe(hashString('spirophonic'))
    expect(hashString('a')).not.toBe(hashString('b'))
    // Scope joining must not let different scopes collide.
    expect(unitValue('seed', 'a', 'bc')).not.toBe(unitValue('seed', 'ab', 'c'))
  })

  it('derives each value from its own scope rather than a running stream', () => {
    const first = unitValue('seed', 'part/a/pitch')
    const second = unitValue('seed', 'part/b/pitch')

    // Asking for one value never affects another.
    expect(unitValue('seed', 'part/a/pitch')).toBe(first)
    expect(first).not.toBe(second)

    // A sequential generator behaves the opposite way, which is why the engine
    // does not use one for scoped values.
    const sequence = createSequence('seed')
    const a = sequence()
    const b = sequence()
    expect(a).not.toBe(b)
  })

  it('bounds an index to its range', () => {
    for (let index = 0; index < 50; index += 1) {
      const value = indexValue(5, 'seed', 'scope', index)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(5)
      expect(Number.isInteger(value)).toBe(true)
    }
    expect(() => indexValue(0, 'seed')).toThrow(/positive integer/)
  })

  it('warns when a recorded randomness version is not this engine', () => {
    expect(variationVersionWarning(randomVersion)).toBeNull()
    expect(variationVersionWarning(undefined)).toBeNull()
    expect(variationVersionWarning(randomVersion + 1)).toMatch(/would reroll/)
  })
})

describe('MG-17 acceptance', () => {
  it('is deep-equal for the same Composition, request, and seed', () => {
    const composition = varied('alpha')
    const first = compilePerformance(composition, request)
    const second = compilePerformance(structuredClone(composition), request)

    expect(second.performedEvents).toEqual(first.performedEvents)
    expect(second.interpretedEvents).toEqual(first.interpretedEvents)
    expect(second.variationTrace).toEqual(first.variationTrace)
  })

  it('changes at least one varied property when the seed changes', () => {
    const alpha = compilePerformance(varied('alpha'), request)
    const beta = compilePerformance(varied('beta'), request)

    expect(beta.performedEvents).not.toEqual(alpha.performedEvents)
    // Initial conditions moved too, so the geometry itself differs.
    expect(beta.encounters.map((item) => item.timeSeconds)).not.toEqual(
      alpha.encounters.map((item) => item.timeSeconds),
    )
  })

  it('does not reroll existing Parts when an unrelated Part is added', () => {
    const base = varied('alpha')
    const before = compilePerformance(base, request)

    const expanded = structuredClone(base)
    expanded.parts.push(notePart('part-z', 72))
    const after = compilePerformance(expanded, request)

    const originalBefore = before.performedEvents.filter(
      (event) => event.partId === 'part-a',
    )
    const originalAfter = after.performedEvents.filter(
      (event) => event.partId === 'part-a',
    )

    // This is what scoped derivation buys: the first Part is untouched.
    expect(originalAfter).toEqual(originalBefore)
    expect(after.performedEvents.length).toBeGreaterThan(
      before.performedEvents.length,
    )
  })

  it('is exactly the unvaried path when variation is disabled', () => {
    const plain = structuredClone(defaultComposition) as Composition
    plain.parts = [notePart('part-a', 48)]

    const withDisabled = structuredClone(plain)
    withDisabled.variation = {
      enabled: false,
      seed: 'alpha',
      initialConditions: { enabled: true, amount: 1 },
      performance: { enabled: true, amount: 1 },
    }

    const unvaried = compilePerformance(plain, request)
    const disabled = compilePerformance(withDisabled, request)

    expect(disabled.performedEvents).toEqual(unvaried.performedEvents)
    expect(disabled.encounters).toEqual(unvaried.encounters)
    expect(disabled.variationTrace).toEqual([])
    // Not merely equal: the two layers are the same array when nothing varies.
    expect(disabled.performedEvents).toBe(disabled.interpretedEvents)
  })

  it('keeps interpreted identity and bounds every performed delta', () => {
    const composition = varied('alpha')
    const performance = compilePerformance(composition, request)

    expect(performance.performedEvents.length).toBe(
      performance.interpretedEvents.length,
    )

    const interpretedById = new Map(
      performance.interpretedEvents.map((event) => [event.id, event]),
    )
    for (const performed of performance.performedEvents) {
      const interpreted = interpretedById.get(performed.id)
      // Identity survives variation.
      expect(interpreted).toBeDefined()
      if (!interpreted) continue
      expect(performed.sourceEncounterId).toBe(interpreted.sourceEncounterId)
      expect(performed.partId).toBe(interpreted.partId)

      // Deltas stay inside the documented bounds.
      expect(
        Math.abs(performed.absoluteBeat - interpreted.absoluteBeat),
      ).toBeLessThanOrEqual(variationBounds.timingBeats + 1e-9)
      expect(
        Math.abs(performed.velocity - interpreted.velocity),
      ).toBeLessThanOrEqual(variationBounds.velocity + 1)
      const durationRatio = performed.durationBeats / interpreted.durationBeats
      expect(durationRatio).toBeGreaterThanOrEqual(
        1 - variationBounds.durationFraction - 1e-9,
      )
      expect(durationRatio).toBeLessThanOrEqual(
        1 + variationBounds.durationFraction + 1e-9,
      )
      expect(performed.velocity).toBeGreaterThanOrEqual(1)
      expect(performed.velocity).toBeLessThanOrEqual(127)
    }
  })

  it('explains which rule changed which value', () => {
    const composition = varied('alpha')
    const performance = compilePerformance(composition, request)

    expect(performance.variationTrace.length).toBeGreaterThan(0)
    const rules = new Set(performance.variationTrace.map((entry) => entry.rule))
    expect(rules.has('wheel-phase')).toBe(true)
    expect(rules.has('timing')).toBe(true)

    for (const entry of performance.variationTrace) {
      expect(entry.targetId).not.toBe('')
      expect(entry.delta).toBeCloseTo(entry.appliedValue - entry.baseValue, 12)
    }
  })

  it('bounds initial-condition variation to its documented maximum', () => {
    const composition = varied('alpha')
    const result = applyInitialConditionVariation(composition)

    for (let index = 0; index < composition.wheels.length; index += 1) {
      expect(
        Math.abs(result.value.wheels[index].phase - composition.wheels[index].phase),
      ).toBeLessThanOrEqual(variationBounds.phaseTurns + 1e-9)
    }
    for (let index = 0; index < composition.fields.length; index += 1) {
      const base = composition.fields[index].rotation ?? 0
      expect(
        Math.abs((result.value.fields[index].rotation ?? 0) - base),
      ).toBeLessThanOrEqual(variationBounds.fieldRotationRadians + 1e-9)
    }
  })
})
