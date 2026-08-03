import type { ShapedEvent } from '../core/rhythm'
import { getEffectiveCyclesPerSecond } from '../core/time'
import { buildMidiFile, type MidiNote, type MidiTrack } from './midi/smf'

/** GM percussion lives on channel 10, which is index 9 on the wire. */
export const percussionChannel = 9

export const gmPercussion = {
  'acoustic-bass-drum': 35,
  'bass-drum': 36,
  'side-stick': 37,
  'acoustic-snare': 38,
  'hand-clap': 39,
  'electric-snare': 40,
  'low-floor-tom': 41,
  'closed-hi-hat': 42,
  'high-floor-tom': 43,
  'pedal-hi-hat': 44,
  'low-tom': 45,
  'open-hi-hat': 46,
  'low-mid-tom': 47,
  'hi-mid-tom': 48,
  'crash-cymbal': 49,
  'high-tom': 50,
  'ride-cymbal': 51,
  'ride-bell': 53,
  tambourine: 54,
  cowbell: 56,
  cabasa: 69,
  claves: 75,
} as const

export type PercussionName = keyof typeof gmPercussion

export type MidiVoiceInput = {
  name: string
  channel: number
  note: number
  events: Array<ShapedEvent>
  /** Held length of each note. Percussion one-shots want a short fixed value. */
  durationTicks?: number
}

export type MidiExportOptions = {
  cyclesPerSecond: number
  beatsPerBar?: number
  bars?: number
  ticksPerQuarter?: number
  name?: string
}

export const defaultMidiExportOptions = {
  beatsPerBar: 4,
  bars: 4,
  ticksPerQuarter: 480,
  percussionDurationTicks: 32,
}

/**
 * One closed curve is one bar, so the cycle rate sets the tempo directly:
 * a bar lasts 1 / cps seconds and holds beatsPerBar beats.
 */
export const midiTempo = (
  cyclesPerSecond: number,
  beatsPerBar = defaultMidiExportOptions.beatsPerBar,
) => {
  const cycles = getEffectiveCyclesPerSecond(cyclesPerSecond)
  const beats = Math.max(1, Math.round(beatsPerBar))
  const beatsPerMinute = 60 * cycles * beats

  return {
    beatsPerMinute,
    microsecondsPerBeat: 60_000_000 / beatsPerMinute,
  }
}

export const buildMidiBytes = (
  voices: Array<MidiVoiceInput>,
  options: MidiExportOptions,
): Uint8Array => {
  const beatsPerBar = Math.max(1, Math.round(options.beatsPerBar ?? defaultMidiExportOptions.beatsPerBar))
  const bars = Math.max(1, Math.round(options.bars ?? defaultMidiExportOptions.bars))
  const ticksPerQuarter = Math.max(
    1,
    Math.round(options.ticksPerQuarter ?? defaultMidiExportOptions.ticksPerQuarter),
  )
  const ticksPerBar = beatsPerBar * ticksPerQuarter
  const { microsecondsPerBeat } = midiTempo(options.cyclesPerSecond, beatsPerBar)

  const tracks: Array<MidiTrack> = voices.map((voice) => ({
    name: voice.name,
    notes: repeatBars(voice, bars, ticksPerBar),
  }))

  return buildMidiFile({
    ticksPerQuarter,
    microsecondsPerBeat,
    timeSignature: { numerator: beatsPerBar, denominator: 4 },
    tracks,
    name: options.name,
  })
}

const repeatBars = (
  voice: MidiVoiceInput,
  bars: number,
  ticksPerBar: number,
): Array<MidiNote> => {
  const duration = voice.durationTicks ?? defaultMidiExportOptions.percussionDurationTicks
  const notes: Array<MidiNote> = []

  for (let bar = 0; bar < bars; bar += 1) {
    for (const event of voice.events) {
      notes.push({
        tick: bar * ticksPerBar + Math.round(event.t * ticksPerBar),
        channel: voice.channel,
        note: voice.note,
        velocity: event.velocity,
        duration,
      })
    }
  }

  return notes
}

export const downloadMidiFile = (bytes: Uint8Array, name: string) => {
  const blob = new Blob([bytes as BlobPart], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mid`
  anchor.click()
  URL.revokeObjectURL(url)
}
