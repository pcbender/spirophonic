import { describe, expect, it } from 'vitest'

import { playNativeDrum } from './drumSynth'
import type { RenderContext } from './instrumentEngine'

/**
 * Captures the buffers a drum voice fills. Only the members drumSynth touches
 * are provided; anything else would be scaffolding the test does not use.
 */
const capturingContext = (sampleRate = 8000) => {
  const buffers: Array<Float32Array> = []
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  })
  const node = () => ({
    connect: () => undefined,
    disconnect: () => undefined,
    frequency: param(),
    Q: param(),
    gain: param(),
    type: '',
    buffer: null,
    start: () => undefined,
    stop: () => undefined,
  })

  const context = {
    sampleRate,
    currentTime: 0,
    state: 'suspended' as AudioContextState,
    destination: node(),
    createGain: node,
    createOscillator: node,
    createStereoPanner: node,
    createBufferSource: node,
    createBiquadFilter: node,
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length)
      buffers.push(data)
      return {
        numberOfChannels: 1,
        length,
        sampleRate,
        getChannelData: () => data,
      }
    },
    resume: async () => undefined,
  }
  return { context: context as unknown as RenderContext, buffers }
}

const noiseFor = () => {
  const { context, buffers } = capturingContext()
  // 'snare' is a noise voice; a tone voice would allocate no buffer.
  playNativeDrum(context, context.destination as unknown as AudioNode, 'snare', 0, 1)
  expect(buffers.length).toBe(1)
  return buffers[0]
}

describe('drum noise is reproducible', () => {
  it('fills identical samples for two separate contexts', () => {
    const first = noiseFor()
    const second = noiseFor()

    expect(second.length).toBe(first.length)
    expect(Array.from(second)).toEqual(Array.from(first))
  })

  it('still produces noise, not a constant or silence', () => {
    const samples = noiseFor()
    const distinct = new Set(Array.from(samples.slice(0, 512)))

    expect(distinct.size).toBeGreaterThan(400)
    for (const value of samples) {
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
    }

    // Roughly zero-mean, as white noise should be.
    const mean =
      Array.from(samples).reduce((sum, value) => sum + value, 0) / samples.length
    expect(Math.abs(mean)).toBeLessThan(0.05)
  })
})
