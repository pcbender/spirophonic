import { describe, expect, it } from 'vitest'

import { encodeWav, readWavHeader } from './wav'

const ramp = (length: number, scale = 1) =>
  Float32Array.from({ length }, (_value, index) =>
    ((index / Math.max(1, length - 1)) * 2 - 1) * scale,
  )

describe('WAV encoding', () => {
  it('states sample rate, channels, bit depth, and length in the header', () => {
    const result = encodeWav([ramp(480), ramp(480)], {
      sampleRateHz: 48_000,
      bitDepth: 24,
    })
    const header = readWavHeader(result.bytes)

    expect(header.sampleRateHz).toBe(48_000)
    expect(header.channelCount).toBe(2)
    expect(header.bitDepth).toBe(24)
    expect(header.frameCount).toBe(480)
    expect(header.durationSeconds).toBeCloseTo(0.01, 10)
    expect(header.isFloat).toBe(false)

    // The declared RIFF size must match the bytes actually produced.
    const view = new DataView(result.bytes.buffer)
    expect(view.getUint32(4, true)).toBe(result.bytes.byteLength - 8)
  })

  it('interleaves channels frame by frame', () => {
    const left = Float32Array.from([1, 0, -1])
    const right = Float32Array.from([-1, 0, 1])
    const result = encodeWav([left, right], {
      sampleRateHz: 8000,
      bitDepth: 16,
    })

    const view = new DataView(result.bytes.buffer)
    const data = result.bytes.byteLength - 3 * 2 * 2
    expect(view.getInt16(data, true)).toBe(32_767)
    expect(view.getInt16(data + 2, true)).toBe(-32_767)
    expect(view.getInt16(data + 4, true)).toBe(0)
    expect(view.getInt16(data + 6, true)).toBe(0)
    expect(view.getInt16(data + 8, true)).toBe(-32_767)
    expect(view.getInt16(data + 10, true)).toBe(32_767)
  })

  it('encodes a signal and its negation to exact opposites', () => {
    const signal = ramp(64, 0.7)
    const inverted = Float32Array.from(signal, (value) => -value)
    const forward = encodeWav([signal], { sampleRateHz: 44_100 })
    const backward = encodeWav([inverted], { sampleRateHz: 44_100 })

    const forwardView = new DataView(forward.bytes.buffer)
    const backwardView = new DataView(backward.bytes.buffer)
    const start = forward.bytes.byteLength - 64 * 2
    for (let index = 0; index < 64; index += 1) {
      expect(backwardView.getInt16(start + index * 2, true)).toBe(
        -forwardView.getInt16(start + index * 2, true),
      )
    }
  })

  it('is byte-identical for identical input', () => {
    const options = { sampleRateHz: 44_100, bitDepth: 16 } as const
    const first = encodeWav([ramp(256)], options)
    const second = encodeWav([ramp(256)], options)
    expect(Array.from(second.bytes)).toEqual(Array.from(first.bytes))
  })

  it('clamps out-of-range samples and reports how many', () => {
    const hot = Float32Array.from([2, -2, 0.5, Number.NaN])
    const result = encodeWav([hot], { sampleRateHz: 44_100, bitDepth: 16 })

    expect(result.clippedSampleCount).toBe(3)
    const view = new DataView(result.bytes.buffer)
    const data = result.bytes.byteLength - 4 * 2
    expect(view.getInt16(data, true)).toBe(32_767)
    expect(view.getInt16(data + 2, true)).toBe(-32_767)
    expect(view.getInt16(data + 6, true)).toBe(0)
  })

  it('writes IEEE float with a fact chunk and no quantization', () => {
    const samples = Float32Array.from([0.123_456_79, -0.987_654_3])
    const result = encodeWav([samples], {
      sampleRateHz: 96_000,
      bitDepth: 32,
    })
    const header = readWavHeader(result.bytes)

    expect(header.isFloat).toBe(true)
    expect(header.bitDepth).toBe(32)
    expect(header.frameCount).toBe(2)

    const view = new DataView(result.bytes.buffer)
    const data = result.bytes.byteLength - 2 * 4
    expect(view.getFloat32(data, true)).toBeCloseTo(0.123_456_79, 6)
    expect(view.getFloat32(data + 4, true)).toBeCloseTo(-0.987_654_3, 6)
  })

  it('refuses input it cannot describe honestly', () => {
    expect(() => encodeWav([], { sampleRateHz: 44_100 })).toThrow(/at least one channel/)
    expect(() =>
      encodeWav([ramp(4), ramp(5)], { sampleRateHz: 44_100 }),
    ).toThrow(/same length/)
    expect(() => encodeWav([ramp(4)], { sampleRateHz: 0 })).toThrow(/positive/)
    expect(() =>
      encodeWav([ramp(4)], { sampleRateHz: 44_100, bitDepth: 8 as never }),
    ).toThrow(/bit depth/)
  })

  it('encodes an empty render as a valid zero-length file', () => {
    const result = encodeWav([new Float32Array(0), new Float32Array(0)], {
      sampleRateHz: 44_100,
    })
    const header = readWavHeader(result.bytes)
    expect(header.frameCount).toBe(0)
    expect(header.durationSeconds).toBe(0)
    expect(header.channelCount).toBe(2)
  })
})
