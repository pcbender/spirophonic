import { midiToFrequency } from '../core/scales'
import type {
  EnvelopeSpec,
  NativeSynthInstrumentSpec,
} from '../core/composition'
import type { Waveform } from '../core/model'
import type { ScheduledAudioVoice } from './instrumentEngine'

type NativeWaveform = NativeSynthInstrumentSpec['waveform']

const defaultEnvelope: EnvelopeSpec = {
  attackSeconds: 0.08,
  decaySeconds: 0,
  sustain: 1,
  releaseSeconds: 0.5,
}

const stopSource = (source: OscillatorNode, atSeconds: number) => {
  try {
    source.stop(atSeconds)
  } catch {
    // A source may already have ended when a late panic reaches it.
  }
}

/**
 * Schedules one native synth voice at an absolute AudioContext time.
 * Instrument gain and pan live on the destination bus; level is the event's
 * normalized velocity.
 */
export const playSynthTone = (
  context: AudioContext,
  destination: AudioNode,
  frequencyHz: number,
  at: number,
  duration: number,
  level: number,
  waveform: NativeWaveform,
  envelopeSpec: EnvelopeSpec,
): ScheduledAudioVoice => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const attack = Math.min(envelopeSpec.attackSeconds, duration)
  const decay = Math.min(envelopeSpec.decaySeconds, Math.max(0, duration - attack))
  const release = envelopeSpec.releaseSeconds
  const peak = Math.max(0.0001, level)
  const sustain = Math.max(0.0001, peak * envelopeSpec.sustain)
  const attackEnd = at + attack
  const decayEnd = attackEnd + decay
  const releaseAt = at + duration
  const endsAt = releaseAt + release

  oscillator.type = waveform
  oscillator.frequency.setValueAtTime(frequencyHz, at)

  gain.gain.setValueAtTime(attack === 0 ? peak : 0, at)
  if (attack > 0) {
    gain.gain.linearRampToValueAtTime(peak, attackEnd)
  }
  if (decay > 0) {
    gain.gain.linearRampToValueAtTime(sustain, decayEnd)
  }
  gain.gain.setValueAtTime(sustain, releaseAt)
  if (release > 0) {
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt)
  }

  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(at)
  stopSource(oscillator, endsAt + 0.02)

  return Object.freeze({
    startsAtSeconds: at,
    endsAtSeconds: endsAt,
    cancel: (atSeconds: number) => {
      gain.gain.cancelScheduledValues(atSeconds)
      gain.gain.setValueAtTime(0.0001, atSeconds)
      stopSource(oscillator, atSeconds + 0.01)
    },
  })
}

/**
 * A pitched note as one oscillator through a soft envelope. Held notes get a
 * long enough release to overlap when a voice asks for it, so a gate above 1
 * sounds like the chord the MIDI file writes.
 */
export const playTone = (
  context: AudioContext,
  destination: AudioNode,
  note: number,
  at: number,
  duration: number,
  level: number,
  waveform: Waveform,
) => {
  return playSynthTone(
    context,
    destination,
    midiToFrequency(note),
    at,
    duration,
    level * 0.28,
    waveform,
    {
      ...defaultEnvelope,
      attackSeconds: Math.min(0.08, duration * 0.35),
      releaseSeconds: Math.min(0.5, Math.max(0.08, duration * 0.6)),
    },
  )
}
