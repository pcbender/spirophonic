import type {
  EnvelopeSpec,
  NativeSynthInstrumentSpec,
} from '../core/composition'
import type {
  InstrumentAutomationDiagnostic,
  RenderContext,
  ScheduledAudioVoice,
  ScheduledModulationLane,
} from './instrumentEngine'

type NativeWaveform = NativeSynthInstrumentSpec['waveform']

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
  context: RenderContext,
  destination: AudioNode,
  frequencyHz: number,
  at: number,
  duration: number,
  level: number,
  waveform: NativeWaveform,
  envelopeSpec: EnvelopeSpec,
): ScheduledAudioVoice => {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  const modulationGain = context.createGain()
  const brightness = context.createBiquadFilter()
  const panner = context.createStereoPanner()
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
  modulationGain.gain.setValueAtTime(1, at)
  brightness.type = 'lowpass'
  brightness.frequency.setValueAtTime(20_000, at)
  panner.pan.setValueAtTime(0, at)

  envelope.gain.setValueAtTime(attack === 0 ? peak : 0, at)
  if (attack > 0) {
    envelope.gain.linearRampToValueAtTime(peak, attackEnd)
  }
  if (decay > 0) {
    envelope.gain.linearRampToValueAtTime(sustain, decayEnd)
  }
  envelope.gain.setValueAtTime(sustain, releaseAt)
  if (release > 0) {
    envelope.gain.exponentialRampToValueAtTime(0.0001, endsAt)
  }

  oscillator.connect(envelope)
  envelope.connect(modulationGain)
  modulationGain.connect(brightness)
  brightness.connect(panner)
  panner.connect(destination)
  oscillator.start(at)
  stopSource(oscillator, endsAt + 0.02)

  const scheduleValues = (
    parameter: AudioParam,
    lane: ScheduledModulationLane,
    transform: (value: number) => number,
  ) => {
    lane.samples.forEach((sample, index) => {
      const value = transform(sample.value)
      if (index === 0) {
        parameter.setValueAtTime(value, sample.audioTimeSeconds)
      } else {
        parameter.linearRampToValueAtTime(value, sample.audioTimeSeconds)
      }
    })
  }

  const scheduleModulation = (
    lanes: ReadonlyArray<ScheduledModulationLane>,
  ): ReadonlyArray<InstrumentAutomationDiagnostic> => {
    for (const lane of lanes) {
      if (lane.entryOnly) continue
      if (lane.target === 'gain') {
        scheduleValues(modulationGain.gain, lane, (value) => value)
      } else if (lane.target === 'pan') {
        scheduleValues(panner.pan, lane, (value) => value)
      } else if (lane.target === 'pitch-offset') {
        scheduleValues(
          oscillator.frequency,
          lane,
          (value) => frequencyHz * 2 ** (value / 12),
        )
      } else if (lane.target === 'brightness') {
        scheduleValues(
          brightness.frequency,
          lane,
          (value) => 80 * (20_000 / 80) ** value,
        )
      }
    }
    return Object.freeze([])
  }

  const cancelModulationFrom = (atSeconds: number) => {
    for (const [parameter, value] of [
      [modulationGain.gain, 1],
      [panner.pan, 0],
      [oscillator.frequency, frequencyHz],
      [brightness.frequency, 20_000],
    ] as const) {
      parameter.cancelScheduledValues(atSeconds)
      parameter.setValueAtTime(value, atSeconds)
    }
  }

  return Object.freeze({
    startsAtSeconds: at,
    endsAtSeconds: endsAt,
    scheduleModulation,
    cancelModulationFrom,
    cancel: (atSeconds: number) => {
      cancelModulationFrom(atSeconds)
      envelope.gain.cancelScheduledValues(atSeconds)
      envelope.gain.setValueAtTime(0.0001, atSeconds)
      stopSource(oscillator, atSeconds + 0.01)
    },
  })
}
