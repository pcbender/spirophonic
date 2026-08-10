import type { Composition, InstrumentSpec } from '../core/composition'
import { eventSounds } from '../core/performance'
import {
  scheduledModulationForOccurrence,
  type RenderContext,
} from '../audio/instrumentEngine'
import { InstrumentRouter } from '../audio/instrumentRouter'
import { NativeSynthEngine } from '../audio/nativeSynthEngine'
import { SoundFontEngine } from '../audio/soundfontEngine'
import type { SoundBankStore } from '../audio/soundbankStore'
import type { ExportablePerformance } from './midiExport'
import { encodeWav, type WavBitDepth, type WavEncodeResult } from './wav'

/**
 * Offline render.
 *
 * The performed layer is the input; this module never recomputes geometry or
 * consults Wheels, Heads, or Fields. It replays exactly the events the live
 * scheduler would have played, through the same engines, into an
 * `OfflineAudioContext` instead of a live one.
 */

export type OfflineRenderContext = RenderContext &
  Readonly<{ startRendering: () => Promise<AudioBuffer> }>

export type OfflineContextFactory = (
  channelCount: number,
  frameCount: number,
  sampleRateHz: number,
) => OfflineRenderContext

export type RenderPhase =
  | 'preparing'
  | 'scheduling'
  | 'rendering'
  | 'encoding'
  | 'done'

export type RenderProgress = Readonly<{
  phase: RenderPhase
  /** 0..1 across the whole job, not within the current phase. */
  fraction: number
  message: string
}>

/**
 * Whether a repeated render of the same input can be expected to produce the
 * same bytes.
 *
 * `deterministic` — every voice came from the native engine. Its oscillators
 * are specified functions of time and its noise buffer is seeded, so two
 * renders agree sample-for-sample.
 *
 * `tolerance` — at least one SoundFont Instrument took part. SpessaSynth makes
 * no documented byte-reproducibility promise across contexts, so two renders
 * are compared within {@link renderAmplitudeTolerance} rather than for
 * equality. This is the criterion's "otherwise" branch, and which branch
 * applies is reported rather than assumed.
 */
export type RenderDeterminism = 'deterministic' | 'tolerance'

/** Maximum sample difference treated as agreement on the tolerance branch. */
export const renderAmplitudeTolerance = 1e-3

export type OfflineRenderRequest = Readonly<{
  performance: ExportablePerformance
  composition: Composition
  sampleRateHz?: number
  channelCount?: number
  bitDepth?: WavBitDepth
  /**
   * Silence appended after the last note-off so releases and reverb ring out
   * instead of being cut at the window edge.
   */
  tailSeconds?: number
  store?: SoundBankStore
  contextFactory?: OfflineContextFactory
  signal?: AbortSignal
  onProgress?: (progress: RenderProgress) => void
}>

export type OfflineRenderResult = Readonly<{
  wav: WavEncodeResult
  determinism: RenderDeterminism
  /** Events actually handed to an engine, after mute/solo and readiness. */
  renderedEventCount: number
  scheduledSeconds: number
  tailSeconds: number
  durationSeconds: number
  /** Instruments a Composition asked for that no engine could provide. */
  issues: ReadonlyArray<string>
}>

export class RenderCancelledError extends Error {
  constructor() {
    super('The offline render was cancelled.')
    this.name = 'RenderCancelledError'
  }
}

export const defaultRenderSampleRateHz = 44_100
export const defaultRenderTailSeconds = 2

const defaultContextFactory: OfflineContextFactory = (
  channelCount,
  frameCount,
  sampleRateHz,
) => {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error(
      'This browser has no OfflineAudioContext, so audio cannot be rendered to a file.',
    )
  }
  return new OfflineAudioContext(
    channelCount,
    frameCount,
    sampleRateHz,
  ) as unknown as OfflineRenderContext
}

/**
 * Bytes the render will hold at its peak: the context's own float buffer plus
 * the encoded file. Callers can warn before starting rather than discovering
 * the cost by running out of memory.
 */
export const estimateRenderBytes = (
  durationSeconds: number,
  sampleRateHz = defaultRenderSampleRateHz,
  channelCount = 2,
  bitDepth: WavBitDepth = 16,
) => {
  const frames = Math.max(0, Math.ceil(durationSeconds * sampleRateHz))
  const floatBytes = frames * channelCount * 4
  const encodedBytes = frames * channelCount * (bitDepth / 8)
  return floatBytes + encodedBytes
}

/**
 * Largest absolute sample difference between two renders. Zero means
 * byte-identical PCM; the tolerance branch compares this against
 * {@link renderAmplitudeTolerance}.
 */
export const comparePcm = (
  left: ReadonlyArray<Float32Array>,
  right: ReadonlyArray<Float32Array>,
) => {
  if (left.length !== right.length) {
    throw new RangeError(
      `Cannot compare ${left.length} channels against ${right.length}.`,
    )
  }
  let largest = 0
  for (let channel = 0; channel < left.length; channel += 1) {
    const a = left[channel]
    const b = right[channel]
    if (a.length !== b.length) {
      throw new RangeError(
        `Cannot compare ${a.length} frames against ${b.length}.`,
      )
    }
    for (let index = 0; index < a.length; index += 1) {
      const difference = Math.abs(a[index] - b[index])
      if (difference > largest) largest = difference
    }
  }
  return largest
}

const audibleInstrumentIds = (performance: ExportablePerformance) => {
  const ids = new Set<string>()
  for (const event of performance.performedEvents) ids.add(event.instrumentId)
  return ids
}

export const renderPerformanceToWav = async (
  request: OfflineRenderRequest,
): Promise<OfflineRenderResult> => {
  const {
    performance,
    composition,
    sampleRateHz = defaultRenderSampleRateHz,
    channelCount = 2,
    bitDepth = 16,
    tailSeconds = defaultRenderTailSeconds,
    store,
    contextFactory = defaultContextFactory,
    signal,
    onProgress,
  } = request

  const issues: Array<string> = []
  const report = (phase: RenderPhase, fraction: number, message: string) =>
    onProgress?.(Object.freeze({ phase, fraction, message }))
  const checkCancelled = () => {
    if (signal?.aborted) throw new RenderCancelledError()
  }

  checkCancelled()
  report('preparing', 0, 'Preparing instruments.')

  // Events carry absolute Transport time; the render starts at the window's
  // own start, so the first event lands where the window says it does.
  const windowStart = performance.request.startSeconds
  const lastEventEnd = performance.performedEvents.reduce(
    (latest, event) =>
      Math.max(latest, event.timeSeconds + event.durationSeconds),
    windowStart,
  )
  const scheduledSeconds = Math.max(
    performance.request.durationSeconds,
    lastEventEnd - windowStart,
  )
  const durationSeconds = scheduledSeconds + Math.max(0, tailSeconds)
  const frameCount = Math.max(1, Math.ceil(durationSeconds * sampleRateHz))

  const instrumentById = new Map<string, InstrumentSpec>(
    composition.instruments.map((instrument) => [instrument.id, instrument]),
  )
  const usedIds = audibleInstrumentIds(performance)
  const usesSoundFont = [...usedIds].some(
    (id) => instrumentById.get(id)?.kind === 'soundfont',
  )

  const context = contextFactory(channelCount, frameCount, sampleRateHz)
  const nativeEngine = new NativeSynthEngine({ contextFactory: () => context })
  const soundFontEngine = store
    ? new SoundFontEngine({ store, contextFactory: () => context })
    : undefined

  if (usesSoundFont && !soundFontEngine) {
    issues.push(
      'This Composition uses SoundFont Instruments, but no sound-bank vault was supplied; those parts are silent.',
    )
  }

  // Without a vault there is nothing to route SoundFont events to, so the
  // native engine is used directly and SoundFont events are skipped below.
  const router = soundFontEngine
    ? new InstrumentRouter({ nativeEngine, soundFontEngine })
    : undefined

  let renderedEventCount = 0
  try {
    if (router) {
      const preparation = await router.prepare(
        composition.soundBanks,
        composition.instruments.filter((instrument) =>
          usedIds.has(instrument.id),
        ),
      )
      for (const issue of preparation.issues) issues.push(issue.message)
    }

    checkCancelled()
    report('scheduling', 0.1, 'Scheduling events.')

    const engine = router ?? nativeEngine
    const total = performance.performedEvents.length
    for (let index = 0; index < total; index += 1) {
      const event = performance.performedEvents[index]
      const instrument = instrumentById.get(event.instrumentId)
      if (!instrument) {
        issues.push(
          `Event ${event.id} names Instrument ${event.instrumentId}, which the Composition does not define.`,
        )
        continue
      }
      if (instrument.kind === 'soundfont' && !router) continue

      // A silenced event is a rest: it stays in the performed layer to keep
      // its interpreted id, but nothing is scheduled for it.
      if (!eventSounds(event)) continue

      // Offline time starts at zero; events are placed relative to the
      // window rather than to a running clock.
      const audioTimeSeconds = event.timeSeconds - windowStart
      const automation = scheduledModulationForOccurrence(
        performance.modulationLanes,
        event.id,
        audioTimeSeconds,
        event.timeSeconds,
      )
      const automationIssues = engine.schedule(
        event,
        instrument,
        audioTimeSeconds,
        automation,
      )
      if (Array.isArray(automationIssues)) {
        for (const issue of automationIssues as ReadonlyArray<{
          message: string
        }>) {
          if (!issues.includes(issue.message)) issues.push(issue.message)
        }
      }
      renderedEventCount += 1

      if (index % 256 === 255) {
        checkCancelled()
        report(
          'scheduling',
          0.1 + 0.2 * ((index + 1) / total),
          `Scheduled ${index + 1} of ${total} events.`,
        )
      }
    }

    checkCancelled()
    report('rendering', 0.3, 'Rendering audio.')
    const buffer = await context.startRendering()
    checkCancelled()

    report('encoding', 0.9, 'Encoding WAV.')
    const channels: Array<Float32Array> = []
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      // getChannelData returns a live view; copy so the encoder is not reading
      // memory the context may still own.
      channels.push(Float32Array.from(buffer.getChannelData(channel)))
    }
    const wav = encodeWav(channels, {
      sampleRateHz: buffer.sampleRate,
      bitDepth,
    })
    if (wav.clippedSampleCount > 0) {
      issues.push(
        `${wav.clippedSampleCount} samples clipped; lower Instrument gain for a clean render.`,
      )
    }

    report('done', 1, 'Render complete.')
    return Object.freeze({
      wav,
      determinism: usesSoundFont && router ? 'tolerance' : 'deterministic',
      renderedEventCount,
      scheduledSeconds,
      tailSeconds: Math.max(0, tailSeconds),
      durationSeconds: wav.durationSeconds,
      issues: Object.freeze(issues),
    })
  } finally {
    // Cancellation and failure release the engines on the same path as
    // success, so a cancelled render leaves no synthesizer or worklet behind.
    await router?.dispose().catch(() => undefined)
    if (!router) await nativeEngine.dispose().catch(() => undefined)
  }
}
