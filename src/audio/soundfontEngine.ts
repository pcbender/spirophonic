import type {
  SoundBankReference,
  SoundFontInstrumentSpec,
} from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'
import type {
  InstrumentAutomationDiagnostic,
  InstrumentEngine,
  RenderContext,
  ScheduledModulationLane,
} from './instrumentEngine'
import { type SoundBankStore } from './soundbankStore'
import { soundBankContainerKind } from './soundfontProbe'
import { registerSpessaSynthWorklet } from './spessasynthWorklet'

export type SoundFontPreset = Readonly<{
  name: string
  program: number
  bankMSB: number
  bankLSB: number
  isDrum: boolean
}>

export type SoundFontIssueCode =
  | 'bank-reference-missing'
  | 'bank-bytes-missing'
  | 'bank-unsupported'
  | 'bank-load-failed'
  | 'preset-missing'
  | 'channel-limit'

export type SoundFontIssue = Readonly<{
  code: SoundFontIssueCode
  instrumentId: string
  soundBankId: string
  message: string
}>

export type SoundFontPreparation = Readonly<{
  readyInstrumentIds: ReadonlyArray<string>
  issues: ReadonlyArray<SoundFontIssue>
  presetsByBankId: Readonly<Record<string, ReadonlyArray<SoundFontPreset>>>
}>

export type SoundFontBankStatus =
  | Readonly<{ state: 'idle' | 'loading' }>
  | Readonly<{
      state: 'ready'
      presets: ReadonlyArray<SoundFontPreset>
    }>
  | Readonly<{ state: 'missing' | 'unsupported' | 'failed'; message: string }>

type SoundFontChannel = {
  setDrums: (isDrum: boolean) => void
  setSystemParameter: (parameter: 'gain' | 'pan', value: number) => void
}

export type SoundFontSynthesizer = {
  readonly currentTime: number
  readonly isReady: Promise<unknown>
  readonly presetList: ReadonlyArray<SoundFontPreset>
  readonly midiChannels: ReadonlyArray<SoundFontChannel>
  readonly soundBankManager: {
    addSoundBank: (bytes: ArrayBuffer, id: string) => Promise<void>
  }
  noteOn: (
    channel: number,
    note: number,
    velocity: number,
    options?: { time?: number },
  ) => void
  noteOff: (
    channel: number,
    note: number,
    options?: { time?: number },
  ) => void
  controllerChange: (
    channel: number,
    controller: number,
    value: number,
    options?: { time?: number },
  ) => void
  programChange: (
    channel: number,
    program: number,
    options?: { time?: number },
  ) => void
  pitchWheel?: (
    channel: number,
    value: number,
    options?: { time?: number },
  ) => void
  stopAll: (force?: boolean) => void
  /**
   * Required, not optional. A synthesizer that is never connected renders into
   * nothing and is silent in a way no unit test with a stub can notice, so the
   * type forces every double to model the connection too.
   */
  connect: (destination: AudioNode) => unknown
  disconnect: (destination?: AudioNode) => unknown
  destroy: () => void
}

export type SoundFontEngineOptions = Readonly<{
  store: SoundBankStore
  contextFactory?: () => RenderContext
  registerWorklet?: (context: BaseAudioContext) => Promise<void>
  /**
   * May return a promise: the default implementation imports the synthesizer
   * on demand. A synchronous factory is still valid, and tests use one.
   */
  synthesizerFactory?: (
    context: BaseAudioContext,
  ) => SoundFontSynthesizer | Promise<SoundFontSynthesizer>
  loadTimeoutMilliseconds?: number
  maxVoices?: number
  /** Bend range in semitones each channel is configured for. */
  pitchBendRangeSemitones?: number
}>

type LoadedBank = {
  digest: string
  synthesizer: SoundFontSynthesizer
  presets: ReadonlyArray<SoundFontPreset>
}

type InstrumentRoute = {
  instrument: SoundFontInstrumentSpec
  channel: number
  bank: LoadedBank
}

type TrackedVoice = {
  synthesizer: SoundFontSynthesizer
  channel: number
  note: number
  instrument: SoundFontInstrumentSpec
  detuneSemitones: number
  automation: ReadonlyArray<ScheduledModulationLane>
  startsAtSeconds: number
  endsAtSeconds: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const soundFontBankNumber = (preset: SoundFontPreset) =>
  preset.bankMSB * 128 + preset.bankLSB

export const splitSoundFontBankNumber = (bank: number) => ({
  bankMSB: Math.floor(bank / 128),
  bankLSB: bank % 128,
})

/**
 * Unwires a synthesizer before discarding it. Destroying a still-connected
 * node leaves the graph holding a reference to a dead worklet.
 */
const retireSynthesizer = (synthesizer: SoundFontSynthesizer) => {
  synthesizer.disconnect()
  synthesizer.destroy()
}

const asPreset = (preset: SoundFontPreset): SoundFontPreset =>
  Object.freeze({
    name: preset.name,
    program: preset.program,
    bankMSB: preset.bankMSB,
    bankLSB: preset.bankLSB,
    isDrum: preset.isDrum,
  })

class SoundFontBankError extends Error {
  readonly state: 'missing' | 'unsupported' | 'failed'

  constructor(
    state: 'missing' | 'unsupported' | 'failed',
    message: string,
  ) {
    super(message)
    this.name = 'SoundFontBankError'
    this.state = state
  }
}

const withTimeout = async <T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
) => {
  let handle: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    handle = setTimeout(() => reject(new Error(message)), milliseconds)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (handle !== undefined) clearTimeout(handle)
  }
}

/**
 * Preloaded SpessaSynth adapter. All IndexedDB and worklet work happens before
 * the synchronous scheduler starts handing it timestamped musical events.
 */
export class SoundFontEngine implements InstrumentEngine {
  private readonly store: SoundBankStore
  private readonly contextFactory: () => RenderContext
  private readonly registerWorklet: (context: BaseAudioContext) => Promise<void>
  private readonly synthesizerFactory: (
    context: BaseAudioContext,
  ) => SoundFontSynthesizer | Promise<SoundFontSynthesizer>
  private readonly loadTimeoutMilliseconds: number
  private readonly maxVoices: number
  private readonly pitchBendRangeSemitones: number
  private readonly banks = new Map<string, LoadedBank>()
  private readonly bankLoads = new Map<string, Promise<LoadedBank>>()
  private readonly bankStatuses = new Map<string, SoundFontBankStatus>()
  private readonly routes = new Map<string, InstrumentRoute>()
  private readonly voices: Array<TrackedVoice> = []
  private context: RenderContext | null = null
  private workletReady: Promise<void> | null = null
  private disposed = false

  constructor(options: SoundFontEngineOptions) {
    this.store = options.store
    this.contextFactory = options.contextFactory ?? (() => new AudioContext())
    this.registerWorklet =
      options.registerWorklet ?? registerSpessaSynthWorklet
    this.synthesizerFactory =
      options.synthesizerFactory ??
      // Imported on demand rather than at module load. SpessaSynth is roughly
      // 207 kB of the production bundle, and a Composition with no SoundFont
      // Instrument never needs it, so it must not be in the initial chunk.
      (async (context) => {
        const { WorkletSynthesizer } = await import('spessasynth_lib')
        return new WorkletSynthesizer(context) as unknown as SoundFontSynthesizer
      })
    this.loadTimeoutMilliseconds = options.loadTimeoutMilliseconds ?? 15_000
    this.maxVoices = options.maxVoices ?? 64
    this.pitchBendRangeSemitones = options.pitchBendRangeSemitones ?? 2
  }

  get currentTimeSeconds() {
    return this.context?.currentTime ?? 0
  }

  statusFor(soundBankId: string): SoundFontBankStatus {
    return this.bankStatuses.get(soundBankId) ?? { state: 'idle' }
  }

  isInstrumentReady(instrumentId: string) {
    return this.routes.has(instrumentId)
  }

  async inspectBank(reference: SoundBankReference) {
    return (await this.ensureBank(reference)).presets
  }

  async prepare(
    references: ReadonlyArray<SoundBankReference>,
    instruments: ReadonlyArray<SoundFontInstrumentSpec>,
  ): Promise<SoundFontPreparation> {
    this.assertUsable()
    // Routes are rebuilt into a local map and swapped in at the end. Clearing
    // them up front would make every Instrument report not-ready across the
    // awaits below, and the scheduler keeps handing us events throughout.
    const nextRoutes = new Map<string, InstrumentRoute>()
    const referenceById = new Map(
      references.map((reference) => [reference.id, reference]),
    )
    const issues: Array<SoundFontIssue> = []
    const readyInstrumentIds: Array<string> = []
    const presetsByBankId: Record<string, ReadonlyArray<SoundFontPreset>> = {}
    const channelCountByBank = new Map<string, number>()

    for (const instrument of [...instruments].sort((left, right) =>
      left.id.localeCompare(right.id),
    )) {
      const reference = referenceById.get(instrument.soundBankId)
      if (!reference) {
        issues.push(
          this.issue(
            'bank-reference-missing',
            instrument,
            `Instrument ${instrument.name} references unavailable bank ${instrument.soundBankId}.`,
          ),
        )
        continue
      }

      let bank: LoadedBank
      try {
        bank = await this.ensureBank(reference)
      } catch (error) {
        const bankError =
          error instanceof SoundFontBankError
            ? error
            : new SoundFontBankError('failed', String(error))
        const code: SoundFontIssueCode =
          bankError.state === 'missing'
            ? 'bank-bytes-missing'
            : bankError.state === 'unsupported'
              ? 'bank-unsupported'
              : 'bank-load-failed'
        issues.push(this.issue(code, instrument, bankError.message))
        continue
      }
      presetsByBankId[reference.id] = bank.presets

      const selected = bank.presets.find(
        (preset) =>
          soundFontBankNumber(preset) === instrument.bank &&
          preset.program === instrument.program &&
          preset.isDrum === instrument.percussion,
      )
      if (!selected) {
        issues.push(
          this.issue(
            'preset-missing',
            instrument,
            `Preset ${instrument.presetName} (${instrument.bank}:${instrument.program}) is not available in ${reference.name}.`,
          ),
        )
        continue
      }

      const channel = channelCountByBank.get(reference.id) ?? 0
      if (channel >= 15) {
        issues.push(
          this.issue(
            'channel-limit',
            instrument,
            `${reference.name} already has 15 concurrent SoundFont Instruments; channel 16 is reserved for audition.`,
          ),
        )
        continue
      }
      channelCountByBank.set(reference.id, channel + 1)
      nextRoutes.set(instrument.id, { instrument, channel, bank })
      readyInstrumentIds.push(instrument.id)
    }

    this.routes.clear()
    for (const [instrumentId, route] of nextRoutes) {
      this.routes.set(instrumentId, route)
    }

    return Object.freeze({
      readyInstrumentIds: Object.freeze(readyInstrumentIds),
      issues: Object.freeze(issues),
      presetsByBankId: Object.freeze(presetsByBankId),
    })
  }

  async audition(
    reference: SoundBankReference,
    preset: SoundFontPreset,
    note: number,
    durationSeconds = 0.6,
  ) {
    const bank = await this.ensureBank(reference)
    const context = this.ensureContext()
    await context.resume?.()
    const synthesizer = bank.synthesizer
    const channel = 15
    const at = synthesizer.currentTime + 0.05
    const { bankMSB, bankLSB } = splitSoundFontBankNumber(
      soundFontBankNumber(preset),
    )
    synthesizer.midiChannels[channel].setDrums(preset.isDrum)
    synthesizer.midiChannels[channel].setSystemParameter('gain', 0.8)
    synthesizer.midiChannels[channel].setSystemParameter('pan', 0)
    this.selectPreset(synthesizer, channel, bankMSB, bankLSB, preset.program, at)
    synthesizer.noteOn(channel, clamp(Math.round(note), 0, 127), 105, {
      time: at,
    })
    synthesizer.noteOff(channel, clamp(Math.round(note), 0, 127), {
      time: at + durationSeconds,
    })
  }

  invalidateBank(soundBankId: string) {
    const loaded = this.banks.get(soundBankId)
    loaded?.synthesizer.stopAll(true)
    if (loaded) retireSynthesizer(loaded.synthesizer)
    this.banks.delete(soundBankId)
    this.bankLoads.delete(soundBankId)
    this.bankStatuses.delete(soundBankId)
    for (const [instrumentId, route] of this.routes) {
      if (route.instrument.soundBankId === soundBankId) {
        this.routes.delete(instrumentId)
      }
    }
  }

  async resume() {
    // An OfflineAudioContext has no transport to resume; rendering drives it.
    if (this.context) await this.context.resume?.()
  }

  async suspend() {
    if (this.context?.state === 'running') await this.context.suspend?.()
  }

  schedule(
    event: NoteMusicalEvent,
    instrument: SoundFontInstrumentSpec,
    audioTimeSeconds: number,
    lanes: ReadonlyArray<ScheduledModulationLane> = [],
  ): ReadonlyArray<InstrumentAutomationDiagnostic> {
    this.assertUsable()
    if (event.instrumentId !== instrument.id) {
      throw new RangeError(
        `Event ${event.id} targets instrument ${event.instrumentId}, not ${instrument.id}.`,
      )
    }
    const route = this.routes.get(instrument.id)
    if (!route) {
      throw new Error(`SoundFont Instrument ${instrument.name} is not ready.`)
    }

    this.pruneVoices()
    const diagnostics: Array<InstrumentAutomationDiagnostic> = []
    const overlapping = this.voices.some(
      (voice) =>
        voice.synthesizer === route.bank.synthesizer &&
        voice.channel === route.channel &&
        voice.startsAtSeconds < audioTimeSeconds + 1e-9 &&
        voice.endsAtSeconds > audioTimeSeconds + 1e-9,
    )
    const activeLanes = overlapping
      ? lanes.filter((lane) => lane.entryOnly)
      : lanes
    if (overlapping) {
      for (const lane of lanes.filter((candidate) => !candidate.entryOnly)) {
        diagnostics.push(
          this.automationIssue(
            'polyphony-limit',
            lane,
            `SoundFont channel ${route.channel + 1} already has a held voice; ${lane.target} modulation for note ${event.id} was omitted because it would also change that voice.`,
          ),
        )
      }
    }
    const voicesAtStart = this.voices.filter(
      (voice) =>
        voice.startsAtSeconds <= audioTimeSeconds + 1e-9 &&
        voice.endsAtSeconds > audioTimeSeconds + 1e-9,
    )
    if (voicesAtStart.length >= this.maxVoices) {
      voicesAtStart.sort(
        (left, right) =>
          left.endsAtSeconds - right.endsAtSeconds ||
          left.startsAtSeconds - right.startsAtSeconds,
      )
      const stolen = voicesAtStart[0]
      if (stolen) {
        this.voices.splice(this.voices.indexOf(stolen), 1)
        this.cancelVoiceAutomationFrom(stolen, audioTimeSeconds)
        stolen.synthesizer.noteOff(stolen.channel, stolen.note, {
          time: audioTimeSeconds,
        })
      }
    }

    const synthesizer = route.bank.synthesizer
    const { bankMSB, bankLSB } = splitSoundFontBankNumber(instrument.bank)
    const channel = route.channel
    // Exact frequency is the source of truth. MIDI can only name whole
    // semitones, so anything between them is played as the nearest note plus a
    // pitch bend. Beyond the channel's configured range the bend would wrap, so
    // the event is played untuned rather than at a wrong pitch.
    const exactMidi =
      event.midiNote ??
      (event.frequencyHz > 0 ? 69 + 12 * Math.log2(event.frequencyHz / 440) : 69)
    const note = clamp(Math.round(exactMidi), 0, 127)
    const detuneSemitones = exactMidi - note
    const options = { time: audioTimeSeconds }
    synthesizer.midiChannels[channel].setDrums(instrument.percussion)
    synthesizer.midiChannels[channel].setSystemParameter(
      'gain',
      instrument.gain,
    )
    synthesizer.midiChannels[channel].setSystemParameter('pan', instrument.pan)
    this.selectPreset(
      synthesizer,
      channel,
      bankMSB,
      bankLSB,
      instrument.program,
      audioTimeSeconds,
    )
    synthesizer.controllerChange(
      channel,
      91,
      Math.round(clamp(instrument.reverb, 0, 1) * 127),
      options,
    )
    synthesizer.controllerChange(
      channel,
      93,
      Math.round(clamp(instrument.chorus, 0, 1) * 127),
      options,
    )
    if (synthesizer.pitchWheel) {
      const withinRange =
        Math.abs(detuneSemitones) <= this.pitchBendRangeSemitones + 1e-9
      const normalized = withinRange
        ? detuneSemitones / this.pitchBendRangeSemitones
        : 0
      // 14-bit wheel, centre 8192.
      synthesizer.pitchWheel(
        channel,
        clamp(Math.round(8192 + normalized * 8191), 0, 16_383),
        options,
      )
    }
    const initialVelocity = activeLanes.find(
      (lane) => lane.target === 'initial-velocity',
    )?.samples[0]?.value
    synthesizer.noteOn(
      channel,
      note,
      clamp(Math.round(initialVelocity ?? event.velocity), 1, 127),
      options,
    )
    synthesizer.noteOff(channel, note, {
      time: audioTimeSeconds + event.durationSeconds,
    })

    for (const lane of activeLanes) {
      if (lane.target === 'initial-velocity') continue
      if (lane.target === 'attack') {
        diagnostics.push(
          this.automationIssue(
            'unsupported-target',
            lane,
            `SoundFont playback cannot translate an attack measured in seconds for preset ${instrument.presetName}; note ${event.id} keeps the preset's attack.`,
          ),
        )
        continue
      }
      if (lane.target === 'gain') {
        if (lane.samples.some((sample) => sample.value > 1)) {
          diagnostics.push(
            this.automationIssue(
              'range-limit',
              lane,
              `SoundFont gain controller 7 stops at 1.0; larger values in lane ${lane.id} are clipped.`,
            ),
          )
        }
        for (const sample of lane.samples) {
          synthesizer.controllerChange(
            channel,
            7,
            Math.round(clamp(sample.value, 0, 1) * 127),
            { time: sample.audioTimeSeconds },
          )
        }
      } else if (lane.target === 'pan') {
        for (const sample of lane.samples) {
          synthesizer.controllerChange(
            channel,
            10,
            Math.round(((clamp(sample.value, -1, 1) + 1) / 2) * 127),
            { time: sample.audioTimeSeconds },
          )
        }
      } else if (lane.target === 'brightness') {
        for (const sample of lane.samples) {
          synthesizer.controllerChange(
            channel,
            74,
            Math.round(clamp(sample.value, 0, 1) * 127),
            { time: sample.audioTimeSeconds },
          )
        }
      } else if (lane.target === 'pitch-offset') {
        let outOfRange = false
        for (const sample of lane.samples) {
          const offset = detuneSemitones + sample.value
          if (Math.abs(offset) > this.pitchBendRangeSemitones + 1e-9) {
            outOfRange = true
          }
          const normalized = clamp(
            offset / this.pitchBendRangeSemitones,
            -1,
            1,
          )
          synthesizer.pitchWheel?.(
            channel,
            clamp(Math.round(8192 + normalized * 8191), 0, 16_383),
            { time: sample.audioTimeSeconds },
          )
        }
        if (!synthesizer.pitchWheel) {
          diagnostics.push(
            this.automationIssue(
              'unsupported-target',
              lane,
              `SoundFont playback backend has no pitch-wheel support; lane ${lane.id} was omitted.`,
            ),
          )
        } else if (outOfRange) {
          diagnostics.push(
            this.automationIssue(
              'range-limit',
              lane,
              `SoundFont pitch lane ${lane.id} exceeds the configured ±${this.pitchBendRangeSemitones}-semitone bend range and is clipped.`,
            ),
          )
        }
      }
    }
    const trackedVoice = {
      synthesizer,
      channel,
      note,
      instrument,
      detuneSemitones,
      automation: activeLanes,
      startsAtSeconds: audioTimeSeconds,
      endsAtSeconds: audioTimeSeconds + event.durationSeconds,
    }
    this.voices.push(trackedVoice)
    if (activeLanes.some((lane) => !lane.entryOnly)) {
      // Controllers and pitch wheels are channel state, unlike the note
      // itself. Restore the preset route at the physical gate exit so one
      // lane cannot leak into the next voice on that channel.
      this.cancelVoiceAutomationFrom(trackedVoice, trackedVoice.endsAtSeconds)
    }
    return Object.freeze(diagnostics)
  }

  /**
   * Releases only the voices that begin at or after the cut, matching the
   * native engine. A note already sounding keeps ringing, so a queued live
   * edit splices in at its boundary instead of chopping the current bar.
   * The release is never placed before its own note-on, which would leave the
   * queued note-on unmatched and the voice stuck open.
   */
  cancelScheduledFrom(audioTimeSeconds: number) {
    for (let index = this.voices.length - 1; index >= 0; index -= 1) {
      const voice = this.voices[index]
      if (voice.startsAtSeconds < audioTimeSeconds) {
        this.cancelVoiceAutomationFrom(voice, audioTimeSeconds)
        continue
      }

      voice.synthesizer.noteOff(voice.channel, voice.note, {
        time: Math.max(audioTimeSeconds, voice.startsAtSeconds),
      })
      this.voices.splice(index, 1)
    }
  }

  panic(audioTimeSeconds: number) {
    for (const voice of this.voices) {
      this.cancelVoiceAutomationFrom(voice, audioTimeSeconds)
    }
    for (const bank of this.banks.values()) bank.synthesizer.stopAll(true)
    this.voices.length = 0
  }

  async dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const bank of this.banks.values()) {
      bank.synthesizer.stopAll(true)
      retireSynthesizer(bank.synthesizer)
    }
    this.banks.clear()
    this.bankLoads.clear()
    this.bankStatuses.clear()
    this.routes.clear()
    this.voices.length = 0
    const context = this.context
    this.context = null
    // Only a live AudioContext can be closed; an offline one is finished when
    // its render resolves, and calling close() on it would throw.
    if (context?.close && context.state !== 'closed') await context.close()
  }

  private issue(
    code: SoundFontIssueCode,
    instrument: SoundFontInstrumentSpec,
    message: string,
  ): SoundFontIssue {
    return Object.freeze({
      code,
      instrumentId: instrument.id,
      soundBankId: instrument.soundBankId,
      message,
    })
  }

  private automationIssue(
    code: InstrumentAutomationDiagnostic['code'],
    lane: ScheduledModulationLane,
    message: string,
  ): InstrumentAutomationDiagnostic {
    return Object.freeze({
      code,
      consumer: 'soundfont' as const,
      target: lane.target,
      laneId: lane.id,
      noteEventId: lane.noteEventId,
      partId: lane.partId,
      instrumentId: lane.instrumentId,
      message,
    })
  }

  private cancelVoiceAutomationFrom(
    voice: TrackedVoice,
    audioTimeSeconds: number,
  ) {
    const resetTimes = new Set<number>([audioTimeSeconds])
    for (const lane of voice.automation) {
      for (const sample of lane.samples) {
        if (sample.audioTimeSeconds >= audioTimeSeconds - 1e-9) {
          resetTimes.add(sample.audioTimeSeconds)
        }
      }
    }
    for (const time of [...resetTimes].sort((left, right) => left - right)) {
      const options = { time }
      voice.synthesizer.controllerChange(
        voice.channel,
        7,
        Math.round(clamp(voice.instrument.gain, 0, 1) * 127),
        options,
      )
      voice.synthesizer.controllerChange(
        voice.channel,
        10,
        Math.round(((clamp(voice.instrument.pan, -1, 1) + 1) / 2) * 127),
        options,
      )
      voice.synthesizer.controllerChange(
        voice.channel,
        74,
        127,
        options,
      )
      if (voice.synthesizer.pitchWheel) {
        const normalized = clamp(
          voice.detuneSemitones / this.pitchBendRangeSemitones,
          -1,
          1,
        )
        voice.synthesizer.pitchWheel(
          voice.channel,
          clamp(Math.round(8192 + normalized * 8191), 0, 16_383),
          options,
        )
      }
    }
  }

  private ensureContext() {
    this.assertUsable()
    if (!this.context) this.context = this.contextFactory()
    return this.context
  }

  private async ensureWorklet() {
    if (this.workletReady) return this.workletReady
    const context = this.ensureContext()
    this.workletReady = this.registerWorklet(context)
    try {
      await this.workletReady
    } catch (error) {
      this.workletReady = null
      throw error
    }
  }

  private ensureBank(reference: SoundBankReference): Promise<LoadedBank> {
    this.assertUsable()
    const loaded = this.banks.get(reference.id)
    if (loaded?.digest === reference.digest) return Promise.resolve(loaded)
    if (loaded) this.invalidateBank(reference.id)
    const pending = this.bankLoads.get(reference.id)
    if (pending) return pending

    this.bankStatuses.set(reference.id, { state: 'loading' })
    const load = this.loadBank(reference)
      .then((bank) => {
        this.banks.set(reference.id, bank)
        this.bankStatuses.set(reference.id, {
          state: 'ready',
          presets: bank.presets,
        })
        return bank
      })
      .catch((error) => {
        const bankError =
          error instanceof SoundFontBankError
            ? error
            : new SoundFontBankError(
                'failed',
                `Could not load ${reference.name}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              )
        this.bankStatuses.set(reference.id, {
          state: bankError.state,
          message: bankError.message,
        })
        throw bankError
      })
      .finally(() => this.bankLoads.delete(reference.id))
    this.bankLoads.set(reference.id, load)
    return load
  }

  private async loadBank(reference: SoundBankReference): Promise<LoadedBank> {
    if (reference.format !== 'sf2' && reference.format !== 'sf3') {
      throw new SoundFontBankError(
        'unsupported',
        `${reference.name} uses unsupported ${reference.format.toUpperCase()} format; MG-11 accepts SF2 and SF3.`,
      )
    }
    const stored = await this.store.get(reference.digest)
    if (!stored) {
      throw new SoundFontBankError(
        'missing',
        `${reference.name} is not in local storage. Relink its ${reference.digest.slice(0, 12)}… digest.`,
      )
    }
    if (soundBankContainerKind(stored.bytes) !== 'soundfont') {
      throw new SoundFontBankError(
        'unsupported',
        `${reference.name} is not a supported SF2/SF3 RIFF bank.`,
      )
    }

    await this.ensureWorklet()
    const context = this.ensureContext()
    const synthesizer = await this.synthesizerFactory(context)
    try {
      // SpessaSynth's worklet node produces nothing audible until it is wired
      // to a destination, and it does not connect itself. Live playback and
      // offline render both reach here, so both are covered by this one line.
      synthesizer.connect(context.destination)
      await withTimeout(
        synthesizer.isReady.then(() => undefined),
        this.loadTimeoutMilliseconds,
        `Timed out initializing ${reference.name}.`,
      )
      await withTimeout(
        synthesizer.soundBankManager.addSoundBank(
          stored.bytes.slice(0),
          reference.id,
        ),
        this.loadTimeoutMilliseconds,
        `Timed out loading ${reference.name}.`,
      )
      await withTimeout(
        synthesizer.isReady.then(() => undefined),
        this.loadTimeoutMilliseconds,
        `Timed out finalizing ${reference.name}.`,
      )
      const presets = Object.freeze(
        synthesizer.presetList.map(asPreset).sort(
          (left, right) =>
            Number(left.isDrum) - Number(right.isDrum) ||
            left.bankMSB - right.bankMSB ||
            left.bankLSB - right.bankLSB ||
            left.program - right.program ||
            left.name.localeCompare(right.name),
        ),
      )
      if (presets.length === 0) {
        throw new Error(`${reference.name} exposes no playable presets.`)
      }
      return { digest: reference.digest, synthesizer, presets }
    } catch (error) {
      retireSynthesizer(synthesizer)
      throw error
    }
  }

  private selectPreset(
    synthesizer: SoundFontSynthesizer,
    channel: number,
    bankMSB: number,
    bankLSB: number,
    program: number,
    atSeconds: number,
  ) {
    const options = { time: atSeconds }
    synthesizer.controllerChange(channel, 0, bankMSB, options)
    synthesizer.controllerChange(channel, 32, bankLSB, options)
    synthesizer.programChange(channel, program, options)
  }

  private pruneVoices() {
    const now = this.currentTimeSeconds
    for (let index = this.voices.length - 1; index >= 0; index -= 1) {
      if (this.voices[index].endsAtSeconds < now) this.voices.splice(index, 1)
    }
  }

  private assertUsable() {
    if (this.disposed) throw new Error('SoundFontEngine has been disposed.')
  }
}
