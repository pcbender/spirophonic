import type {
  InstrumentSpec,
  NativeDrumInstrumentSpec,
  NativeSynthInstrumentSpec,
} from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'
import { playNativeDrum } from './drumSynth'
import type {
  InstrumentEngine,
  RenderContext,
  ScheduledAudioVoice,
} from './instrumentEngine'
import { playSynthTone } from './toneSynth'

export type NativeTonePlayer = (
  context: RenderContext,
  destination: AudioNode,
  frequencyHz: number,
  atSeconds: number,
  durationSeconds: number,
  level: number,
  waveform: NativeSynthInstrumentSpec['waveform'],
  envelope: NativeSynthInstrumentSpec['envelope'],
) => ScheduledAudioVoice

export type NativeDrumPlayer = (
  context: RenderContext,
  destination: AudioNode,
  voice: NativeDrumInstrumentSpec['voice'],
  atSeconds: number,
  level: number,
) => ScheduledAudioVoice

export type NativeSynthEngineOptions = Readonly<{
  contextFactory?: () => RenderContext
  tonePlayer?: NativeTonePlayer
  drumPlayer?: NativeDrumPlayer
  masterGain?: number
}>

type InstrumentBus = Readonly<{
  gain: GainNode
  panner: StereoPannerNode
}>

type TrackedVoice = Readonly<{
  eventId: string
  voice: ScheduledAudioVoice
}>

/** Web Audio backend for the dependency-free native synth and drum voices. */
export class NativeSynthEngine implements InstrumentEngine {
  private readonly contextFactory: () => RenderContext
  private readonly tonePlayer: NativeTonePlayer
  private readonly drumPlayer: NativeDrumPlayer
  private readonly masterGain: number
  private readonly buses = new Map<string, InstrumentBus>()
  private readonly voices: Array<TrackedVoice> = []
  private context: RenderContext | null = null
  private master: GainNode | null = null
  private disposed = false

  constructor(options: NativeSynthEngineOptions = {}) {
    this.contextFactory = options.contextFactory ?? (() => new AudioContext())
    this.tonePlayer = options.tonePlayer ?? playSynthTone
    this.drumPlayer = options.drumPlayer ?? playNativeDrum
    this.masterGain = options.masterGain ?? 0.35
  }

  get currentTimeSeconds() {
    return this.context?.currentTime ?? 0
  }

  async resume() {
    // An OfflineAudioContext has no transport to resume; rendering drives it.
    await this.ensureContext().resume?.()
  }

  async suspend() {
    if (this.context?.state === 'running') {
      await this.context.suspend?.()
    }
  }

  schedule(
    event: NoteMusicalEvent,
    instrument: InstrumentSpec,
    audioTimeSeconds: number,
  ) {
    this.assertUsable()
    if (event.instrumentId !== instrument.id) {
      throw new RangeError(
        `Event ${event.id} targets instrument ${event.instrumentId}, not ${instrument.id}.`,
      )
    }
    if (instrument.kind === 'soundfont') {
      throw new RangeError(
        `Instrument ${instrument.id} requires the SoundFont engine planned for MG-11.`,
      )
    }

    const context = this.ensureContext()
    const destination = this.busFor(instrument, audioTimeSeconds).gain
    const level = event.velocity / 127
    const voice =
      instrument.kind === 'native-synth'
        ? this.tonePlayer(
            context,
            destination,
            event.frequencyHz,
            audioTimeSeconds,
            event.durationSeconds,
            level,
            instrument.waveform,
            instrument.envelope,
          )
        : this.drumPlayer(
            context,
            destination,
            instrument.voice,
            audioTimeSeconds,
            level,
          )

    this.pruneVoices()
    this.voices.push(Object.freeze({ eventId: event.id, voice }))
  }

  cancelScheduledFrom(audioTimeSeconds: number) {
    const cancelAt = this.currentTimeSeconds

    for (let index = this.voices.length - 1; index >= 0; index -= 1) {
      const tracked = this.voices[index]
      if (tracked.voice.startsAtSeconds >= audioTimeSeconds) {
        tracked.voice.cancel(cancelAt)
        this.voices.splice(index, 1)
      }
    }
  }

  panic(audioTimeSeconds: number) {
    for (const tracked of this.voices) {
      tracked.voice.cancel(audioTimeSeconds)
    }
    this.voices.length = 0
  }

  async dispose() {
    if (this.disposed) return

    const context = this.context
    if (context) {
      this.panic(context.currentTime)
    }
    for (const bus of this.buses.values()) {
      bus.gain.disconnect()
      bus.panner.disconnect()
    }
    this.buses.clear()
    this.master?.disconnect()
    this.master = null
    this.context = null
    this.disposed = true

    // Only a live AudioContext can be closed; an offline one is finished when
    // its render resolves, and calling close() on it would throw.
    if (context?.close && context.state !== 'closed') {
      await context.close()
    }
  }

  private ensureContext() {
    this.assertUsable()
    if (this.context) return this.context

    const context = this.contextFactory()
    const master = context.createGain()
    master.gain.value = this.masterGain
    master.connect(context.destination)
    this.context = context
    this.master = master
    return context
  }

  private busFor(instrument: InstrumentSpec, audioTimeSeconds: number) {
    const held = this.buses.get(instrument.id)
    if (held) {
      held.gain.gain.setValueAtTime(instrument.gain, audioTimeSeconds)
      held.panner.pan.setValueAtTime(instrument.pan, audioTimeSeconds)
      return held
    }

    const context = this.ensureContext()
    const master = this.master
    if (!master) throw new Error('Native synth master bus is unavailable.')

    const gain = context.createGain()
    const panner = context.createStereoPanner()
    gain.gain.setValueAtTime(instrument.gain, audioTimeSeconds)
    panner.pan.setValueAtTime(instrument.pan, audioTimeSeconds)
    gain.connect(panner)
    panner.connect(master)

    const bus = Object.freeze({ gain, panner })
    this.buses.set(instrument.id, bus)
    return bus
  }

  private pruneVoices() {
    const now = this.currentTimeSeconds
    for (let index = this.voices.length - 1; index >= 0; index -= 1) {
      if (this.voices[index].voice.endsAtSeconds < now) {
        this.voices.splice(index, 1)
      }
    }
  }

  private assertUsable() {
    if (this.disposed) {
      throw new Error('NativeSynthEngine has been disposed.')
    }
  }
}
