import type { Composition, InstrumentSpec } from '../core/composition'
import type { CanonicalPerformance, NoteMusicalEvent } from '../core/performance'
import { frequencyToMidi } from '../core/scales'
import { secondsToBeats } from '../core/transport'
import { buildMidiFile, type MidiNote, type MidiTrack } from './midi/smf'

/** General MIDI percussion is channel 10, represented as zero-based index 9. */
export const percussionChannel = 9

export const nativeDrumMidiNotes = {
  kick: 36,
  snare: 38,
  hat: 42,
  tom: 45,
  clap: 39,
  cymbal: 49,
} as const

export type PerformanceMidiOptions = Readonly<{
  ticksPerQuarter?: number
  name?: string
}>

const melodicChannel = (index: number) => {
  const channel = index % 15
  return channel >= percussionChannel ? channel + 1 : channel
}

const midiNoteFor = (
  event: NoteMusicalEvent,
  instrument: InstrumentSpec,
) =>
  instrument.kind === 'native-drum'
    ? nativeDrumMidiNotes[instrument.voice]
    : Math.round(event.midiNote ?? frequencyToMidi(event.frequencyHz))

const trackForPart = (
  partId: string,
  partName: string,
  instrument: InstrumentSpec,
  events: ReadonlyArray<NoteMusicalEvent>,
  startBeat: number,
  ticksPerQuarter: number,
  partIndex: number,
): MidiTrack => {
  const channel =
    instrument.kind === 'native-drum' ||
    (instrument.kind === 'soundfont' && instrument.percussion)
      ? percussionChannel
      : melodicChannel(partIndex)
  const notes: Array<MidiNote> = events
    .filter((event) => event.partId === partId)
    .map((event) => ({
      tick: Math.max(
        0,
        Math.round((event.absoluteBeat - startBeat) * ticksPerQuarter),
      ),
      channel,
      note: midiNoteFor(event, instrument),
      velocity: event.velocity,
      duration: Math.max(1, Math.round(event.durationBeats * ticksPerQuarter)),
    }))

  return {
    name: partName,
    channel,
    ...(instrument.kind === 'soundfont' && !instrument.percussion
      ? { program: instrument.program }
      : {}),
    notes,
  }
}

/** Initial SMF adapter over the exact canonical events heard by the scheduler. */
export const buildPerformanceMidi = (
  performance: CanonicalPerformance,
  composition: Composition,
  options: PerformanceMidiOptions = {},
) => {
  const ticksPerQuarter = Math.max(
    1,
    Math.round(options.ticksPerQuarter ?? 480),
  )
  const tracks = buildPerformanceMidiTracks(
    performance,
    composition,
    ticksPerQuarter,
  )

  return buildMidiFile({
    ticksPerQuarter,
    microsecondsPerBeat: 60_000_000 / composition.transport.tempoBpm,
    timeSignature: {
      numerator: composition.transport.meter.beatsPerBar,
      denominator: composition.transport.meter.beatUnit,
    },
    tracks,
    name: options.name ?? composition.name,
  })
}

export const buildPerformanceMidiTracks = (
  performance: CanonicalPerformance,
  composition: Composition,
  ticksPerQuarter = 480,
): Array<MidiTrack> => {
  const startBeat = secondsToBeats(
    performance.request.startSeconds,
    composition.transport.tempoBpm,
  )
  const instruments = new Map(
    composition.instruments.map((instrument) => [instrument.id, instrument]),
  )
  const noteParts = composition.parts.filter(
    (part) => part.enabled && part.kind === 'note',
  )

  return noteParts.map((part, partIndex) => {
    const instrument = instruments.get(part.instrumentId)
    if (!instrument) {
      throw new RangeError(
        `Part ${part.id} references missing instrument ${part.instrumentId}.`,
      )
    }
    return trackForPart(
      part.id,
      part.name,
      instrument,
      performance.performedEvents,
      startBeat,
      ticksPerQuarter,
      partIndex,
    )
  })
}

export const downloadPerformanceMidi = (
  performance: CanonicalPerformance,
  composition: Composition,
) => {
  const blob = new Blob([buildPerformanceMidi(performance, composition) as BlobPart], {
    type: 'audio/midi',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileStem(composition.name)}.mid`
  anchor.click()
  URL.revokeObjectURL(url)
}

const fileStem = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'spirophonic'
