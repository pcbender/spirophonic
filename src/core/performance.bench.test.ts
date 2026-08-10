import { describe, expect, it } from 'vitest'

import {
  concurrentWheelsComposition,
  multiHeadWheelComposition,
  relationHarmonyComposition,
  ringAndSpokeComposition,
  seededVariationComposition,
  showcaseComposition,
} from '../test/fixtures/compositions'
import { PerformanceScheduler } from '../audio/performanceScheduler'
import { estimateRenderBytes } from '../export/audioRender'
import { compilePerformance } from './performance'

/**
 * Release budgets for whole-Composition compilation.
 *
 * These assert **work**, not wall-clock. Event and Encounter counts are exact
 * functions of the Composition, so they are identical on every machine, and a
 * change in any of them means the geometry, selection, or interpretation
 * changed — which is precisely the regression worth failing a build over.
 *
 * Elapsed time is measured and reported but only checked against a deliberately
 * loose ceiling. A budget tight enough to be interesting on the reference
 * machine would fail on a loaded CI box for reasons that have nothing to do
 * with this repository, and a benchmark that fails for unrelated reasons stops
 * being read. The reference measurements are recorded in
 * `docs/examples/BENCHMARKS.md`; treat a large move there as the signal, and
 * these assertions as the guard against catastrophe.
 */

const window8s = { startSeconds: 0, durationSeconds: 8, sampleRateHz: 240 }

/** Ten times the slowest reference-machine measurement, rounded up. */
const catastropheCeilingMs = 12_000

const measure = <T>(run: () => T) => {
  const startedAt = performance.now()
  const value = run()
  return { value, elapsedMs: performance.now() - startedAt }
}

describe('compilation work budgets', () => {
  it('compiles each reference Composition to its checked-in event count', () => {
    const budgets = [
      { label: 'ring and spoke', build: ringAndSpokeComposition, encounters: 53, events: 48 },
      { label: 'multi-Head Wheel', build: multiHeadWheelComposition, encounters: 128, events: 110 },
      { label: 'concurrent Wheels', build: concurrentWheelsComposition, encounters: 749, events: 149 },
      { label: 'showcase', build: showcaseComposition, encounters: 749, events: 149 },
      { label: 'seeded variation', build: seededVariationComposition, encounters: 752, events: 148 },
    ] as const

    for (const budget of budgets) {
      const { value: compiled, elapsedMs } = measure(() =>
        compilePerformance(budget.build(), window8s),
      )
      expect(
        {
          encounters: compiled.encounters.length,
          events: compiled.performedEvents.length,
        },
        budget.label,
      ).toEqual({ encounters: budget.encounters, events: budget.events })
      expect(elapsedMs, `${budget.label} elapsed`).toBeLessThan(
        catastropheCeilingMs,
      )
    }
  })

  it('grows linearly with the performance window, not quadratically', () => {
    const counts = [4, 8, 16].map(
      (durationSeconds) =>
        compilePerformance(concurrentWheelsComposition(), {
          ...window8s,
          durationSeconds,
        }).encounters.length,
    )

    expect(counts).toEqual([377, 749, 1519])
    // Doubling the window roughly doubles the work. A quadratic regression
    // would show up here as a ratio near four.
    const firstRatio = counts[1] / counts[0]
    const secondRatio = counts[2] / counts[1]
    expect(firstRatio).toBeGreaterThan(1.8)
    expect(firstRatio).toBeLessThan(2.2)
    expect(secondRatio).toBeGreaterThan(1.8)
    expect(secondRatio).toBeLessThan(2.2)
  })

  it('produces the same events regardless of scan sample rate', () => {
    // Sample rate is a detection setting, not a musical one. If a rate change
    // moves the events, the refinement stopped converging.
    const byRate = [120, 240, 480].map((sampleRateHz) =>
      compilePerformance(concurrentWheelsComposition(), {
        ...window8s,
        sampleRateHz,
      }),
    )

    for (const compiled of byRate.slice(1)) {
      expect(compiled.encounters.length).toBe(byRate[0].encounters.length)
      expect(compiled.performedEvents.map((event) => event.id)).toEqual(
        byRate[0].performedEvents.map((event) => event.id),
      )
    }
  })

  it('holds the relation and control budget', () => {
    const compiled = compilePerformance(relationHarmonyComposition(), window8s)
    expect({
      relationEncounters: compiled.relationEncounters.length,
      controlLanes: compiled.controlLanes.length,
    }).toEqual({ relationEncounters: 798, controlLanes: 1 })
  })

  it('repeats a compile identically, so a budget means something', () => {
    const first = compilePerformance(concurrentWheelsComposition(), window8s)
    const second = compilePerformance(concurrentWheelsComposition(), window8s)
    expect(second.performedEvents).toEqual(first.performedEvents)
  })
})

/**
 * Scheduling load and offline render cost.
 *
 * These sit beside the compilation budgets because they are budgets on the same
 * canonical layer: how many events the scheduler must hand an engine for a
 * window, and how much memory rendering that window needs. Both import only the
 * pure, injectable surfaces — the scheduler takes a clock and an engine, and
 * the render estimate is a function — so neither reaches a Web Audio API.
 */
describe('scheduling load budget', () => {
  it('hands the engine exactly the sounding events, once each', async () => {
    const composition = concurrentWheelsComposition()
    const compiled = compilePerformance(composition, window8s)
    const scheduled: Array<string> = []

    const scheduler = new PerformanceScheduler(
      {
        currentTimeSeconds: 0,
        resume: async () => undefined,
        suspend: async () => undefined,
        schedule: (event) => scheduled.push(event.id),
        cancelScheduledFrom: () => undefined,
        panic: () => undefined,
        dispose: async () => undefined,
      },
      {
        clock: { setInterval: () => 1, clearInterval: () => undefined },
        // A look-ahead past the whole window, so one pass covers everything.
        lookaheadSeconds: 60,
        tickMilliseconds: 25,
        startDelaySeconds: 0,
      },
    )

    await scheduler.start(compiled, composition.instruments, {
      tempoBpm: composition.transport.tempoBpm,
    })

    const sounding = compiled.performedEvents.filter((event) => !event.rest)
    expect(scheduled.length).toBe(sounding.length)
    // No event is handed over twice, which would double-trigger a voice.
    expect(new Set(scheduled).size).toBe(scheduled.length)

    await scheduler.dispose()
  })

  it('keeps per-second scheduling load proportional to the window', async () => {
    const composition = concurrentWheelsComposition()
    const loadFor = async (durationSeconds: number) => {
      const compiled = compilePerformance(composition, {
        ...window8s,
        durationSeconds,
      })
      let count = 0
      const scheduler = new PerformanceScheduler(
        {
          currentTimeSeconds: 0,
          resume: async () => undefined,
          suspend: async () => undefined,
          schedule: () => {
            count += 1
          },
          cancelScheduledFrom: () => undefined,
          panic: () => undefined,
          dispose: async () => undefined,
        },
        {
          clock: { setInterval: () => 1, clearInterval: () => undefined },
          lookaheadSeconds: 120,
          tickMilliseconds: 25,
          startDelaySeconds: 0,
        },
      )
      await scheduler.start(compiled, composition.instruments, {
        tempoBpm: composition.transport.tempoBpm,
      })
      await scheduler.dispose()
      return count / durationSeconds
    }

    const short = await loadFor(4)
    const long = await loadFor(16)

    // Events per second is a property of the Composition, not of how long you
    // look at it. A large move means density changed, not that the window did.
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short * 0.8)
    expect(long).toBeLessThan(short * 1.25)
  })
})

describe('offline render memory budget', () => {
  it('estimates the peak cost of a render before starting one', () => {
    // Stereo 16-bit at 44.1 kHz: a float buffer the context owns plus the
    // encoded file. Ten seconds is about 5.0 MB peak.
    const tenSeconds = estimateRenderBytes(10, 44_100, 2, 16)
    expect(tenSeconds).toBe(10 * 44_100 * 2 * 4 + 10 * 44_100 * 2 * 2)
    expect(tenSeconds / 1_048_576).toBeCloseTo(5.05, 1)

    // Cost is linear in duration, so a caller can warn proportionally.
    expect(estimateRenderBytes(20, 44_100, 2, 16)).toBe(tenSeconds * 2)
    expect(estimateRenderBytes(0)).toBe(0)
  })

  it('holds the reference render within a stated ceiling', () => {
    const composition = concurrentWheelsComposition()
    const compiled = compilePerformance(composition, window8s)
    const renderSeconds = compiled.request.durationSeconds + 2

    // The reference work renders in about 5 MB. A regression that made the
    // render allocate per event rather than per frame would blow past this.
    const bytes = estimateRenderBytes(renderSeconds, 44_100, 2, 16)
    expect(bytes).toBeLessThan(8 * 1_048_576)
    expect(bytes).toBeGreaterThan(1_048_576)
  })
})
