import { describe, expect, it } from 'vitest'

import type { CycleRate, TransportSpec } from './composition'
import {
  barPhaseAtBeat,
  barsToBeats,
  beatsToBars,
  beatsToSeconds,
  iterateTimeGrid,
  loopPhaseAtBeat,
  normalizeCycleRate,
  normalizePerformanceRequest,
  normalizeTransport,
  secondsToBeats,
  transportAddressAtSeconds,
  validatePerformanceRequest,
  wheelPhaseAtBeat,
  wheelPhaseAtSeconds,
  wrapCyclePhase,
} from './transport'

const transport: TransportSpec = {
  tempoBpm: 120,
  meter: { beatsPerBar: 4, beatUnit: 4 },
  loop: { startBeat: 0, lengthBeats: 4 },
}

describe('Transport conversions', () => {
  it('converts four beats to two seconds at 120 BPM without geometry', () => {
    expect(beatsToSeconds(4, 120)).toBe(2)
    expect(secondsToBeats(2, 120)).toBe(4)
  })

  it('converts beats and bars using meter only', () => {
    expect(beatsToBars(7, transport.meter)).toBe(1.75)
    expect(barsToBeats(1.75, transport.meter)).toBe(7)
    expect(barPhaseAtBeat(7, transport.meter)).toBe(0.75)
  })

  it('reports the zero-based bar, beat, and phase for a mid-bar request', () => {
    expect(transportAddressAtSeconds(transport, 3.25)).toEqual({
      seconds: 3.25,
      absoluteBeat: 6.5,
      barIndex: 1,
      beatInBar: 2.5,
      barPhase: 0.625,
    })
  })

  it('evaluates the same absolute time identically on every call', () => {
    const first = transportAddressAtSeconds(transport, 17 / 60)

    expect(transportAddressAtSeconds(transport, 17 / 60)).toEqual(first)
    expect(transportAddressAtSeconds(transport, 17 / 60)).toEqual(first)
  })

  it('rejects non-finite conversion inputs', () => {
    expect(() => secondsToBeats(Number.NaN, 120)).toThrow(RangeError)
    expect(() => wrapCyclePhase(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('rational Wheel rates', () => {
  const cases: Array<{
    rate: CycleRate
    beat: number
    phase: number
  }> = [
    { rate: { cycles: 1, beats: 4 }, beat: 1, phase: 0.25 },
    { rate: { cycles: 1, beats: 4 }, beat: 4, phase: 0 },
    { rate: { cycles: 3, beats: 2 }, beat: 1, phase: 0.5 },
    { rate: { cycles: 3, beats: 2 }, beat: 2, phase: 0 },
    { rate: { cycles: 5, beats: 8 }, beat: 4, phase: 0.5 },
    { rate: { cycles: 5, beats: 8 }, beat: 8, phase: 0 },
  ]

  it.each(cases)('evaluates $rate.cycles/$rate.beats at beat $beat', ({
    rate,
    beat,
    phase,
  }) => {
    expect(wheelPhaseAtBeat(rate, beat)).toBe(phase)
  })

  it('applies initial phase and direction without a second clock', () => {
    const rate = { cycles: 1, beats: 4 }

    expect(wheelPhaseAtBeat(rate, 1, 0.125)).toBe(0.375)
    expect(wheelPhaseAtBeat(rate, 1, 0.125, 'reverse')).toBe(0.875)
    expect(wheelPhaseAtSeconds(rate, transport, 0.5)).toBe(0.25)
  })

  it('keeps Wheel phase independent from bar phase and curve closure', () => {
    const beat = 1

    expect(barPhaseAtBeat(beat, transport.meter)).toBe(0.25)
    expect(wheelPhaseAtBeat({ cycles: 3, beats: 2 }, beat)).toBe(0.5)
  })
})

describe('Transport normalization', () => {
  it('clamps tempo, meter, and loop controls to documented limits', () => {
    const normalized = normalizeTransport({
      tempoBpm: 1_000,
      meter: { beatsPerBar: 0.2, beatUnit: 8 },
      loop: { startBeat: -4, lengthBeats: 1_000_000 },
    })

    expect(normalized).toEqual({
      tempoBpm: 400,
      meter: { beatsPerBar: 1, beatUnit: 8 },
      loop: { startBeat: 0, lengthBeats: 100_000 },
    })
  })

  it('uses deterministic defaults for non-finite or non-positive rates', () => {
    expect(
      normalizeCycleRate({ cycles: Number.NaN, beats: 0 }),
    ).toEqual({ cycles: 1, beats: 4 })
  })

  it('normalizes the complete compiler request and preserves its seed', () => {
    expect(
      normalizePerformanceRequest({
        startSeconds: -1,
        durationSeconds: 100_000,
        sampleRateHz: 2_000,
        seed: 'take-7',
      }),
    ).toEqual({
      startSeconds: 0,
      durationSeconds: 86_400,
      sampleRateHz: 1_000,
      seed: 'take-7',
    })
  })

  it('strictly validates the compiler request before normalization', () => {
    expect(
      validatePerformanceRequest({
        startSeconds: 1.25,
        durationSeconds: 8,
        sampleRateHz: 120,
        seed: 'take-7',
      }),
    ).toEqual({
      ok: true,
      request: {
        startSeconds: 1.25,
        durationSeconds: 8,
        sampleRateHz: 120,
        seed: 'take-7',
      },
    })
  })

  it('reports path-specific compiler request issues in stable order', () => {
    expect(
      validatePerformanceRequest({
        startSeconds: -1,
        durationSeconds: Number.NaN,
        sampleRateHz: 2_000,
        surprise: true,
      }),
    ).toEqual({
      ok: false,
      issues: [
        { path: '$.surprise', message: 'Unknown property.' },
        {
          path: '$.startSeconds',
          message: 'Expected a value from 0 through 31536000.',
        },
        {
          path: '$.durationSeconds',
          message: 'Expected a finite number.',
        },
        {
          path: '$.sampleRateHz',
          message: 'Expected a value from 1 through 1000.',
        },
      ],
    })
  })

  it('calculates loop phase independently of bars and Wheels', () => {
    expect(loopPhaseAtBeat(10, { startBeat: 2, lengthBeats: 6 })).toBeCloseTo(
      1 / 3,
      12,
    )
  })
})

describe('compiler time grid', () => {
  it('includes an off-grid request start and end exactly once', () => {
    const times = Array.from(
      iterateTimeGrid({
        startSeconds: 0.1,
        durationSeconds: 1,
        sampleRateHz: 3,
      }),
    )

    expect(times).toEqual([0.1, 0.1 + 1 / 3, 0.1 + 2 / 3, 1.1])
    expect(times.filter((time) => time === 0.1)).toHaveLength(1)
    expect(times.filter((time) => time === 1.1)).toHaveLength(1)
  })

  it('derives each point from its index instead of accumulating steps', () => {
    const request = {
      startSeconds: 2.25,
      durationSeconds: 10,
      sampleRateHz: 60,
    }
    const times = Array.from(iterateTimeGrid(request))

    expect(times).toHaveLength(601)
    expect(times[317]).toBe(request.startSeconds + 317 / 60)
    expect(times.at(-1)).toBe(12.25)
    expect(Array.from(iterateTimeGrid(request))).toEqual(times)
  })

  it('rejects invalid compiler requests instead of silently clamping them', () => {
    expect(() =>
      Array.from(
        iterateTimeGrid({
          startSeconds: -1,
          durationSeconds: 4,
          sampleRateHz: 60,
        }),
      ),
    ).toThrow('$.startSeconds')
  })

  it('produces the same core state at shared times for different frame rates', () => {
    const slow = Array.from(
      iterateTimeGrid({
        startSeconds: 0,
        durationSeconds: 2,
        sampleRateHz: 2,
      }),
    )
    const fast = new Map(
      Array.from(iterateTimeGrid({
        startSeconds: 0,
        durationSeconds: 2,
        sampleRateHz: 60,
      })).map((seconds) => [
        seconds,
        transportAddressAtSeconds(transport, seconds),
      ]),
    )

    for (const seconds of slow) {
      expect(fast.get(seconds)).toEqual(
        transportAddressAtSeconds(transport, seconds),
      )
    }
  })
})
