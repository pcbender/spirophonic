/**
 * General MIDI percussion built from oscillators and filtered noise. No
 * samples and no soundfont, so the preview works offline and adds nothing to
 * the repository. It is a drum machine rather than a kit, and it is only ever
 * an audition: the exported MIDI carries note numbers, and the DAW decides
 * what they sound like.
 */

import type { NativeDrumInstrumentSpec } from '../core/composition'
import type { ScheduledAudioVoice } from './instrumentEngine'

type DrumShape = {
  kind: 'tone' | 'noise'
  /** Starting frequency, or filter cutoff for noise. */
  frequency: number
  /** Where a tone slides to, as a fraction of its start. */
  bend?: number
  decay: number
  /** Balances the voices against each other. */
  level: number
  /** Adds a short pitched body under a noise hit. */
  body?: number
}

const shapes: Record<number, DrumShape> = {
  35: { kind: 'tone', frequency: 140, bend: 0.3, decay: 0.42, level: 1 },
  36: { kind: 'tone', frequency: 150, bend: 0.3, decay: 0.34, level: 1 },
  37: { kind: 'noise', frequency: 2600, decay: 0.04, level: 0.5 },
  38: { kind: 'noise', frequency: 1700, decay: 0.17, level: 0.7, body: 185 },
  39: { kind: 'noise', frequency: 1200, decay: 0.13, level: 0.6 },
  40: { kind: 'noise', frequency: 2100, decay: 0.14, level: 0.7, body: 220 },
  41: { kind: 'tone', frequency: 100, bend: 0.55, decay: 0.4, level: 0.8 },
  42: { kind: 'noise', frequency: 7800, decay: 0.045, level: 0.42 },
  43: { kind: 'tone', frequency: 120, bend: 0.55, decay: 0.38, level: 0.8 },
  44: { kind: 'noise', frequency: 7200, decay: 0.07, level: 0.34 },
  45: { kind: 'tone', frequency: 150, bend: 0.55, decay: 0.36, level: 0.8 },
  46: { kind: 'noise', frequency: 7000, decay: 0.32, level: 0.4 },
  47: { kind: 'tone', frequency: 185, bend: 0.55, decay: 0.34, level: 0.8 },
  48: { kind: 'tone', frequency: 225, bend: 0.55, decay: 0.32, level: 0.8 },
  49: { kind: 'noise', frequency: 4200, decay: 1.1, level: 0.42 },
  50: { kind: 'tone', frequency: 270, bend: 0.55, decay: 0.3, level: 0.8 },
  51: { kind: 'noise', frequency: 8600, decay: 0.5, level: 0.32, body: 620 },
  53: { kind: 'noise', frequency: 9200, decay: 0.36, level: 0.32, body: 880 },
  54: { kind: 'noise', frequency: 6200, decay: 0.12, level: 0.36 },
  56: { kind: 'tone', frequency: 620, decay: 0.24, level: 0.5 },
  69: { kind: 'noise', frequency: 5200, decay: 0.1, level: 0.34 },
  75: { kind: 'tone', frequency: 2300, decay: 0.05, level: 0.5 },
}

const fallback: DrumShape = {
  kind: 'noise',
  frequency: 3200,
  decay: 0.12,
  level: 0.5,
}

const nativeVoiceNotes: Record<NativeDrumInstrumentSpec['voice'], number> = {
  kick: 36,
  snare: 38,
  hat: 42,
  tom: 45,
  clap: 39,
  cymbal: 49,
}

let noise: AudioBuffer | null = null
let noiseContext: AudioContext | null = null

/** One second of white noise, built once and reused by every hit. */
const noiseBuffer = (context: AudioContext) => {
  if (noise && noiseContext === context) {
    return noise
  }

  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const channel = buffer.getChannelData(0)

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1
  }

  noise = buffer
  noiseContext = context

  return buffer
}

export const playDrum = (
  context: AudioContext,
  destination: AudioNode,
  note: number,
  at: number,
  level: number,
): ScheduledAudioVoice => {
  const shape = shapes[note] ?? fallback
  const peak = level * shape.level

  if (shape.kind === 'tone') {
    return tone(context, destination, shape, at, peak)
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  source.buffer = noiseBuffer(context)
  filter.type = shape.frequency > 4000 ? 'highpass' : 'bandpass'
  filter.frequency.setValueAtTime(shape.frequency, at)
  filter.Q.setValueAtTime(shape.frequency > 4000 ? 0.7 : 1.4, at)

  envelope(gain, at, peak, shape.decay)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  source.start(at)
  const endsAt = at + shape.decay
  source.stop(endsAt + 0.02)

  const noiseVoice = scheduledVoice(source, gain, at, endsAt)

  if (shape.body) {
    const bodyVoice = tone(
      context,
      destination,
      { ...shape, kind: 'tone', frequency: shape.body, bend: 0.7, decay: shape.decay * 0.6 },
      at,
      peak * 0.6,
    )

    return Object.freeze({
      startsAtSeconds: at,
      endsAtSeconds: Math.max(noiseVoice.endsAtSeconds, bodyVoice.endsAtSeconds),
      cancel: (atSeconds: number) => {
        noiseVoice.cancel(atSeconds)
        bodyVoice.cancel(atSeconds)
      },
    })
  }

  return noiseVoice
}

export const playNativeDrum = (
  context: AudioContext,
  destination: AudioNode,
  voice: NativeDrumInstrumentSpec['voice'],
  at: number,
  level: number,
) => playDrum(context, destination, nativeVoiceNotes[voice], at, level)

const tone = (
  context: AudioContext,
  destination: AudioNode,
  shape: DrumShape,
  at: number,
  peak: number,
): ScheduledAudioVoice => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(shape.frequency, at)

  if (shape.bend) {
    // A falling pitch is what reads as a drum being struck rather than a beep.
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, shape.frequency * shape.bend),
      at + shape.decay * 0.6,
    )
  }

  envelope(gain, at, peak, shape.decay)

  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(at)
  const endsAt = at + shape.decay
  oscillator.stop(endsAt + 0.02)

  return scheduledVoice(oscillator, gain, at, endsAt)
}

const envelope = (gain: GainNode, at: number, peak: number, decay: number) => {
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(Math.max(0.0001, peak), at + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)
}

const scheduledVoice = (
  source: AudioScheduledSourceNode,
  gain: GainNode,
  startsAtSeconds: number,
  endsAtSeconds: number,
): ScheduledAudioVoice =>
  Object.freeze({
    startsAtSeconds,
    endsAtSeconds,
    cancel: (atSeconds: number) => {
      gain.gain.cancelScheduledValues(atSeconds)
      gain.gain.setValueAtTime(0.0001, atSeconds)

      try {
        source.stop(atSeconds + 0.01)
      } catch {
        // A source may already have ended when a late panic reaches it.
      }
    },
  })
