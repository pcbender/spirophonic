import { describe, expect, it } from 'vitest'

import type { Composition } from './composition'
import { validateComposition } from './compositionValidation'
import { defaultComposition, referenceComposition } from './defaultComposition'
import {
  exportCompositionToJson,
  parseCompositionJson,
} from '../export/compositionJson'
import { compilePerformance } from './performance'

const clone = () => structuredClone(referenceComposition) as Composition

describe('reference Composition', () => {
  it('meets the MG-12 scale requirement', () => {
    expect(referenceComposition.wheels).toHaveLength(4)
    for (const wheel of referenceComposition.wheels) {
      expect(wheel.heads.length).toBeGreaterThanOrEqual(3)
    }
    expect(referenceComposition.parts.length).toBeGreaterThanOrEqual(4)
    expect(referenceComposition.instruments.length).toBeGreaterThanOrEqual(4)
  })

  it('validates and round-trips through JSON without drift', () => {
    expect(validateComposition(clone()).ok).toBe(true)

    const json = exportCompositionToJson(clone())
    const parsed = parseCompositionJson(json)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.composition).toEqual(clone())
    expect(exportCompositionToJson(parsed.composition)).toBe(json)
  })

  it('compiles concurrent events across every Wheel and Instrument', () => {
    const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 240 }
    const performance = compilePerformance(clone(), request)

    expect(
      performance.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([])
    expect(performance.performedEvents.length).toBeGreaterThan(0)

    // Every Wheel contributes Encounters.
    const wheelIds = new Set(
      performance.encounters.map((encounter) => encounter.wheelId),
    )
    expect(wheelIds).toEqual(
      new Set(referenceComposition.wheels.map((wheel) => wheel.id)),
    )

    // All four Instruments sound.
    const instrumentIds = new Set(
      performance.performedEvents.map((event) => event.instrumentId),
    )
    expect(instrumentIds.size).toBe(4)

    // Heads on the same Wheel are distinguishable rather than coincident.
    const headIds = new Set(
      performance.encounters.map((encounter) => encounter.headId),
    )
    expect(headIds.size).toBeGreaterThanOrEqual(8)
  })

  it('orders simultaneous events deterministically and recompiles identically', () => {
    const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 240 }
    const first = compilePerformance(clone(), request)
    const second = compilePerformance(clone(), request)

    expect(second.performedEvents).toEqual(first.performedEvents)

    const times = first.performedEvents.map((event) => event.timeSeconds)
    const sorted = [...times].sort((left, right) => left - right)
    expect(times).toEqual(sorted)

    // Where several events share a timestamp, the tie-break is stable and total.
    const shared = new Map<number, Array<string>>()
    for (const event of first.performedEvents) {
      shared.set(event.timeSeconds, [
        ...(shared.get(event.timeSeconds) ?? []),
        event.id,
      ])
    }
    const collisions = [...shared.values()].filter((ids) => ids.length > 1)
    expect(collisions.length).toBeGreaterThan(0)
    for (const ids of collisions) {
      expect(ids).toEqual([...ids].sort())
    }
  })

  it('holds a deterministic Encounter budget that is independent of sample rate', () => {
    // Checked-in benchmark for the event-growth risk. The counts are stable
    // because crossing refinement converges, so a regression here means the
    // geometry or the selection logic changed, not that the grid moved.
    const counts = [120, 240, 480].map((sampleRateHz) => {
      const performance = compilePerformance(clone(), {
        startSeconds: 0,
        durationSeconds: 8,
        sampleRateHz,
      })
      return {
        encounters: performance.encounters.length,
        events: performance.performedEvents.length,
      }
    })

    expect(counts[0]).toEqual({ encounters: 850, events: 161 })
    expect(counts[1]).toEqual(counts[0])
    expect(counts[2]).toEqual(counts[0])
  })

  it('seeks and loops over the same events as a whole-window compile', () => {
    const whole = compilePerformance(clone(), {
      startSeconds: 0,
      durationSeconds: 4,
      sampleRateHz: 240,
    })
    const secondHalf = compilePerformance(clone(), {
      startSeconds: 2,
      durationSeconds: 2,
      sampleRateHz: 240,
    })

    const wholeLate = whole.encounters
      .filter((encounter) => encounter.timeSeconds > 2.0001)
      .map((encounter) => encounter.id)
    const seeked = secondHalf.encounters
      .filter((encounter) => encounter.timeSeconds > 2.0001)
      .map((encounter) => encounter.id)

    expect(seeked).toEqual(wholeLate)
  })
})

describe('default Composition stays the light first-run experience', () => {
  it('is smaller than the reference and still valid', () => {
    expect(validateComposition(structuredClone(defaultComposition) as Composition).ok).toBe(true)
    expect(defaultComposition.wheels.length).toBeLessThan(
      referenceComposition.wheels.length,
    )
  })
})
