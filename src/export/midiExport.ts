import { noteLengths } from '../core/rhythm'
import { getEffectiveCyclesPerSecond } from '../core/time'
import type { VoiceNote } from '../core/voices'
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
  notes: Array<VoiceNote>
  /** General MIDI program, selected once at the top of the track. */
  program?: number
  /** Grid steps in one bar, which sets how long a step is. */
  steps: number
  /** Note length as a multiple of one step. Above 1, notes overlap. */
  gate: number
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
    channel: voice.channel,
    program: voice.program,
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
  const lengths = noteLengths(voice.notes, { steps: voice.steps, gate: voice.gate })
  const notes: Array<MidiNote> = []

  for (let bar = 0; bar < bars; bar += 1) {
    voice.notes.forEach((event, index) => {
      notes.push({
        tick: bar * ticksPerBar + Math.round(event.t * ticksPerBar),
        channel: voice.channel,
        note: event.note,
        velocity: event.velocity,
        duration: Math.max(1, Math.round(lengths[index] * ticksPerBar)),
      })
    })
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
