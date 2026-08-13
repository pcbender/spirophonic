import { describe, expect, it } from 'vitest'

import type { WaveShape } from './composition'
import { radialWavePointAtTurn, waveformValueAtTurn } from './curves'

describe('closed radial waveforms', () => {
  it.each([
    ['sine', [0, 1, 0, -1, 0]],
    ['triangle', [-1, 0, 1, 0, -1]],
  ] satisfies Array<[WaveShape, number[]]>) (
    'normalizes the %s waveform across one period',
    (waveform, expected) => {
      const actual = [0, 0.25, 0.5, 0.75, 1].map((turn) =>
        waveformValueAtTurn(waveform, turn),
      )

      actual.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 12)
      })
    },
  )

  it('gives square a deterministic continuous connector', () => {
    expect(waveformValueAtTurn('square', 0)).toBe(0)
    expect(waveformValueAtTurn('square', 0.05)).toBe(1)
    expect(waveformValueAtTurn('square', 0.25)).toBe(1)
    expect(waveformValueAtTurn('square', 0.5)).toBeCloseTo(0, 12)
    expect(waveformValueAtTurn('square', 0.75)).toBe(-1)
    expect(waveformValueAtTurn('square', 1)).toBe(0)
    expect(waveformValueAtTurn('square', 1 - 1e-7)).toBeCloseTo(-2e-6, 5)
    expect(waveformValueAtTurn('square', 1e-7)).toBeCloseTo(2e-6, 5)
  })

  it('gives sawtooth a deterministic continuous reset', () => {
    expect(waveformValueAtTurn('sawtooth', 0)).toBe(-1)
    expect(waveformValueAtTurn('sawtooth', 0.45)).toBe(0)
    expect(waveformValueAtTurn('sawtooth', 0.9)).toBeCloseTo(1, 12)
    expect(waveformValueAtTurn('sawtooth', 0.95)).toBeCloseTo(0, 12)
    expect(waveformValueAtTurn('sawtooth', 1)).toBe(-1)
    expect(waveformValueAtTurn('sawtooth', 1 - 1e-7)).toBeCloseTo(-0.999998, 5)
    expect(waveformValueAtTurn('sawtooth', 1e-7)).toBeCloseTo(-0.9999998, 5)
  })

  it('uses amplitude and periodicity without losing exact cycle closure', () => {
    const start = radialWavePointAtTurn(0, 'sine', 20, 3, 100)
    const crest = radialWavePointAtTurn(1 / 12, 'sine', 20, 3, 100)
    const nextWaveStart = radialWavePointAtTurn(1 / 3, 'sine', 20, 3, 100)

    expect(radialWavePointAtTurn(1, 'sine', 20, 3, 100)).toEqual(start)
    expect(Math.hypot(...start)).toBeCloseTo(100, 12)
    expect(Math.hypot(...crest)).toBeCloseTo(120, 12)
    expect(Math.hypot(...nextWaveStart)).toBeCloseTo(100, 12)
    const circle = radialWavePointAtTurn(0.37, 'triangle', 0, 7, 100)
    expect(Math.hypot(...circle)).toBeCloseTo(100, 10)
  })

  it('rejects non-finite waveform time', () => {
    expect(() => waveformValueAtTurn('sine', Number.NaN)).toThrow('finite')
  })
})
