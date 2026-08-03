import { midiToFrequency } from '../core/scales'
import type { Waveform } from '../core/model'

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
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const attack = Math.min(0.08, duration * 0.35)
  const release = Math.min(0.5, Math.max(0.08, duration * 0.6))
  const peak = Math.max(0.0001, level * 0.28)

  oscillator.type = waveform
  oscillator.frequency.setValueAtTime(midiToFrequency(note), at)

  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(peak, at + attack)
  gain.gain.setValueAtTime(peak, at + duration)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration + release)

  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(at)
  oscillator.stop(at + duration + release + 0.02)
}
