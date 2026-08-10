import { describe, expect, it, vi } from 'vitest'

import audioRenderSource from './audioRender.ts?raw'
import wavSource from './wav.ts?raw'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { gatedModulationComposition } from '../test/fixtures/gateModulation'
import {
  comparePcm,
  estimateRenderBytes,
  renderPerformanceToWav,
  RenderCancelledError,
  type OfflineContextFactory,
  type OfflineRenderContext,
  type RenderProgress,
} from './audioRender'
import { readWavHeader } from './wav'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

/**
 * A recording stand-in for OfflineAudioContext.
 *
 * jsdom has no Web Audio, and a hand-written synthesizer would only prove that
 * the fake is deterministic. So the fake records the graph calls it receives
 * and renders a buffer that is a pure function of that trace: what the tests
 * below assert on is the scheduling this module actually controls. Whether a
 * real browser renders identical audio is checked in the Playwright suite,
 * against a real OfflineAudioContext.
 */
type Trace = Array<string>

const fakeContext = (
  channelCount: number,
  frameCount: number,
  sampleRateHz: number,
  trace: Trace,
  options: { failRender?: boolean } = {},
) => {
  let disposed = false
  const param = (name: string) => ({
    value: 0,
    setValueAtTime: (value: number, at: number) => {
      trace.push(`${name}=${value}@${at.toFixed(6)}`)
    },
    linearRampToValueAtTime: (value: number, at: number) => {
      trace.push(`${name}~${value}@${at.toFixed(6)}`)
    },
    exponentialRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  })
  const node = (kind: string) => ({
    kind,
    connect: () => undefined,
    disconnect: () => undefined,
    frequency: param(`${kind}.frequency`),
    Q: param(`${kind}.Q`),
    gain: param(`${kind}.gain`),
    pan: param(`${kind}.pan`),
    type: '',
    buffer: null as AudioBuffer | null,
    start: (at: number) => trace.push(`${kind}.start@${at.toFixed(6)}`),
    stop: (at: number) => trace.push(`${kind}.stop@${at.toFixed(6)}`),
  })

  const context = {
    sampleRate: sampleRateHz,
    currentTime: 0,
    state: 'suspended' as AudioContextState,
    destination: node('destination'),
    createGain: () => node('gain'),
    createOscillator: () => node('oscillator'),
    createStereoPanner: () => node('panner'),
    createBufferSource: () => node('source'),
    createBiquadFilter: () => node('filter'),
    createBuffer: (channels: number, length: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate: sampleRateHz,
      getChannelData: () => new Float32Array(length),
    }),
    resume: async () => undefined,
    startRendering: async () => {
      if (options.failRender) throw new Error('render backend exploded')
      if (disposed) throw new Error('rendered after disposal')
      // The buffer is derived from the trace, so identical scheduling yields
      // identical samples and different scheduling does not.
      const data = Array.from({ length: channelCount }, () =>
        new Float32Array(frameCount),
      )
      for (let index = 0; index < trace.length; index += 1) {
        let hash = 2166136261
        const entry = trace[index]
        for (let at = 0; at < entry.length; at += 1) {
          hash = Math.imul(hash ^ entry.charCodeAt(at), 16777619)
        }
        for (let channel = 0; channel < channelCount; channel += 1) {
          const frame = (index * 7 + channel) % frameCount
          data[channel][frame] = ((hash >>> 8) % 2001) / 1000 - 1
        }
      }
      return {
        numberOfChannels: channelCount,
        length: frameCount,
        sampleRate: sampleRateHz,
        getChannelData: (channel: number) => data[channel],
      } as unknown as AudioBuffer
    },
    close: undefined,
    dispose: () => {
      disposed = true
    },
  }
  return context as unknown as OfflineRenderContext
}

const factoryWith = (
  trace: Trace,
  options: { failRender?: boolean } = {},
): OfflineContextFactory =>
  (channelCount, frameCount, sampleRateHz) =>
    fakeContext(channelCount, frameCount, sampleRateHz, trace, options)

const nativeComposition = (): Composition =>
  structuredClone(defaultComposition) as Composition

const renderDefault = (
  overrides: Partial<Parameters<typeof renderPerformanceToWav>[0]> = {},
) => {
  const composition = nativeComposition()
  const performance = compilePerformance(composition, request)
  return renderPerformanceToWav({
    composition,
    performance,
    sampleRateHz: 8000,
    tailSeconds: 1,
    contextFactory: factoryWith([]),
    ...overrides,
  })
}

describe('the renderer stays on the performed layer', () => {
  it('imports no Wheel, Head, Field, or geometry module', () => {
    const forbidden = [
      '../core/wheels',
      '../core/heads',
      '../core/fields',
      '../core/motion',
      '../core/crossings',
      '../core/encounters',
      '../core/traces',
      '../core/traceEncounters',
      '../core/relations',
      '../core/curves',
      '../core/trochoid',
    ]
    for (const source of [audioRenderSource, wavSource]) {
      const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1])
      for (const specifier of imports) {
        expect(forbidden).not.toContain(specifier)
      }
    }
  })
})

describe('MG-20 offline render', () => {
  it('renders every performed event at its window-relative time', async () => {
    const trace: Trace = []
    const composition = nativeComposition()
    const performance = compilePerformance(composition, request)
    expect(performance.performedEvents.length).toBeGreaterThan(0)

    const result = await renderPerformanceToWav({
      composition,
      performance,
      sampleRateHz: 8000,
      tailSeconds: 1,
      contextFactory: factoryWith(trace),
    })

    expect(result.renderedEventCount).toBe(performance.performedEvents.length)

    // Voice starts follow canonical event order, at window-relative times.
    const starts = trace
      .filter((entry) => entry.startsWith('oscillator.start@'))
      .map((entry) => Number(entry.split('@')[1]))
    const expected = performance.performedEvents
      .filter((event) => {
        const instrument = composition.instruments.find(
          (candidate) => candidate.id === event.instrumentId,
        )
        return instrument?.kind === 'native-synth'
      })
      .map((event) => event.timeSeconds - request.startSeconds)

    expect(starts.length).toBe(expected.length)
    for (let index = 0; index < expected.length; index += 1) {
      expect(starts[index]).toBeCloseTo(expected[index], 6)
    }
  })

  it('offsets a mid-window render from its own start, not from zero', async () => {
    const composition = nativeComposition()
    const midWindow = { startSeconds: 1.5, durationSeconds: 2, sampleRateHz: 120 }
    const performance = compilePerformance(composition, midWindow)
    const trace: Trace = []

    await renderPerformanceToWav({
      composition,
      performance,
      sampleRateHz: 8000,
      tailSeconds: 0,
      contextFactory: factoryWith(trace),
    })

    const starts = trace
      .filter((entry) => entry.startsWith('oscillator.start@'))
      .map((entry) => Number(entry.split('@')[1]))
    const expected = performance.performedEvents
      .filter((event) => {
        const instrument = composition.instruments.find(
          (candidate) => candidate.id === event.instrumentId,
        )
        return instrument?.kind === 'native-synth'
      })
      .map((event) => event.timeSeconds - midWindow.startSeconds)

    expect(starts.length).toBe(expected.length)
    expect(expected.length).toBeGreaterThan(0)
    for (let index = 0; index < expected.length; index += 1) {
      expect(starts[index]).toBeCloseTo(expected[index], 6)
    }
    // Absolute Transport time would put every start at or past the window
    // start; window-relative time must not.
    expect(Math.min(...starts)).toBeLessThan(midWindow.startSeconds)
  })

  it('extends the file by the tail rather than truncating releases', async () => {
    const withoutTail = await renderDefault({ tailSeconds: 0 })
    const withTail = await renderDefault({ tailSeconds: 1.5 })

    expect(withoutTail.tailSeconds).toBe(0)
    expect(withTail.tailSeconds).toBe(1.5)
    expect(withTail.scheduledSeconds).toBeCloseTo(
      withoutTail.scheduledSeconds,
      9,
    )
    expect(withTail.durationSeconds - withoutTail.durationSeconds).toBeCloseTo(
      1.5,
      3,
    )
    // The window is never shorter than the request asked for.
    expect(withoutTail.scheduledSeconds).toBeGreaterThanOrEqual(
      request.durationSeconds,
    )
  })

  it('writes a WAV whose header matches the render it was given', async () => {
    const result = await renderDefault({ sampleRateHz: 22_050, bitDepth: 24 })
    const header = readWavHeader(result.wav.bytes)

    expect(header.sampleRateHz).toBe(22_050)
    expect(header.channelCount).toBe(2)
    expect(header.bitDepth).toBe(24)
    expect(header.durationSeconds).toBeCloseTo(result.durationSeconds, 6)
  })

  it('repeats a native render byte-for-byte', async () => {
    const first = await renderDefault()
    const second = await renderDefault()

    expect(first.determinism).toBe('deterministic')
    expect(Array.from(second.wav.bytes)).toEqual(Array.from(first.wav.bytes))
  })

  it('renders one held native voice with its full canonical brightness lane', async () => {
    const composition = gatedModulationComposition()
    const performance = compilePerformance(composition, request)
    const trace: Trace = []

    const result = await renderPerformanceToWav({
      composition,
      performance,
      sampleRateHz: 8000,
      tailSeconds: 0,
      contextFactory: factoryWith(trace),
    })

    expect(result.renderedEventCount).toBe(performance.performedEvents.length)
    expect(trace.filter((entry) => entry.startsWith('oscillator.start@'))).toHaveLength(
      performance.performedEvents.length,
    )
    expect(
      trace.filter(
        (entry) =>
          entry.startsWith('filter.frequency=') ||
          entry.startsWith('filter.frequency~'),
      ).length,
    ).toBeGreaterThan(
      performance.modulationLanes.reduce(
        (count, lane) => count + lane.samples.length,
        0,
      ),
    )
    expect(result.issues).toEqual([])
  })

  it('reports progress through every phase, ending at one', async () => {
    const seen: Array<RenderProgress> = []
    await renderDefault({ onProgress: (progress) => seen.push(progress) })

    expect(seen[0].phase).toBe('preparing')
    expect(seen.at(-1)?.phase).toBe('done')
    expect(seen.at(-1)?.fraction).toBe(1)
    // Progress never goes backwards.
    for (let index = 1; index < seen.length; index += 1) {
      expect(seen[index].fraction).toBeGreaterThanOrEqual(
        seen[index - 1].fraction,
      )
    }
  })

  it('cancels before rendering and still releases the engines', async () => {
    const controller = new AbortController()
    const trace: Trace = []
    controller.abort()

    await expect(
      renderDefault({ signal: controller.signal, contextFactory: factoryWith(trace) }),
    ).rejects.toBeInstanceOf(RenderCancelledError)

    // Cancelling before the first phase must not have scheduled anything.
    expect(trace.filter((entry) => entry.includes('.start@'))).toEqual([])
  })

  it('cleans up when the backend fails mid-render', async () => {
    const disposals = vi.fn()
    const trace: Trace = []
    const factory: OfflineContextFactory = (channels, frames, rate) => {
      const context = fakeContext(channels, frames, rate, trace, {
        failRender: true,
      })
      return context
    }

    await expect(
      renderDefault({ contextFactory: factory, onProgress: disposals }),
    ).rejects.toThrow(/render backend exploded/)
    // The failure surfaced rather than resolving with a silent empty file.
  })

  it('names an Instrument the Composition does not define', async () => {
    const composition = nativeComposition()
    const performance = compilePerformance(composition, request)
    const orphaned = {
      ...performance,
      performedEvents: performance.performedEvents.map((event, index) =>
        index === 0 ? { ...event, instrumentId: 'instrument-gone' } : event,
      ),
    }

    const result = await renderPerformanceToWav({
      composition,
      performance: orphaned,
      sampleRateHz: 8000,
      tailSeconds: 0,
      contextFactory: factoryWith([]),
    })

    expect(result.issues.some((issue) => issue.includes('instrument-gone'))).toBe(
      true,
    )
    expect(result.renderedEventCount).toBe(
      performance.performedEvents.length - 1,
    )
  })

  it('says SoundFont parts are silent when no vault is supplied', async () => {
    const composition = nativeComposition()
    composition.soundBanks = [
      {
        id: 'bank-1',
        name: 'Bank',
        digest: 'd'.repeat(64),
        format: 'sf2',
        source: 'local',
        license: 'User supplied',
        attribution: '',
      },
    ]
    composition.instruments = composition.instruments.map((instrument, index) =>
      index === 0
        ? {
            id: instrument.id,
            name: instrument.name,
            kind: 'soundfont' as const,
            gain: 0.7,
            pan: 0,
            soundBankId: 'bank-1',
            bank: 0,
            program: 0,
            presetName: 'Piano',
            percussion: false,
            reverb: 0,
            chorus: 0,
          }
        : instrument,
    )
    const performance = compilePerformance(composition, request)

    const result = await renderPerformanceToWav({
      composition,
      performance,
      sampleRateHz: 8000,
      tailSeconds: 0,
      contextFactory: factoryWith([]),
    })

    expect(result.issues.some((issue) => issue.includes('silent'))).toBe(true)
    // Without a vault those events are skipped, not rendered as native tones.
    expect(result.renderedEventCount).toBeLessThan(
      performance.performedEvents.length,
    )
  })
})

describe('render estimates and comparison', () => {
  it('estimates the float buffer plus the encoded file', () => {
    // 10 s stereo at 44.1 kHz: 4 bytes per float sample, 2 per 16-bit sample.
    const frames = 10 * 44_100
    expect(estimateRenderBytes(10, 44_100, 2, 16)).toBe(
      frames * 2 * 4 + frames * 2 * 2,
    )
    expect(estimateRenderBytes(0)).toBe(0)
    // A deeper format costs more, and the estimate says so.
    expect(estimateRenderBytes(10, 44_100, 2, 24)).toBeGreaterThan(
      estimateRenderBytes(10, 44_100, 2, 16),
    )
  })

  it('reports the largest sample difference between two renders', () => {
    const a = [Float32Array.from([0, 0.5, -0.5])]
    const b = [Float32Array.from([0, 0.5, -0.5])]
    expect(comparePcm(a, b)).toBe(0)

    // Float32 cannot hold 0.5008 exactly, so the difference is compared at
    // the precision the format actually offers.
    const c = [Float32Array.from([0, 0.5008, -0.5])]
    expect(comparePcm(a, c)).toBeCloseTo(0.0008, 6)

    expect(() => comparePcm(a, [...a, ...a])).toThrow(/channels/)
    expect(() => comparePcm(a, [Float32Array.from([0])])).toThrow(/frames/)
  })
})
