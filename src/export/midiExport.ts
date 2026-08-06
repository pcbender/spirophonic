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
  /**
   * Semitone bend range each channel is assumed to be configured for. MIDI
   * cannot state this in-file without RPN, so it is declared and reported.
   */
  pitchBendRangeSemitones?: number
}>

export type MidiExportDiagnostic = Readonly<{
  code: 'bend-capacity' | 'channel-capacity'
  eventId?: string
  partId?: string
  message: string
}>

export type MidiExportResult = Readonly<{
  bytes: Uint8Array
  diagnostics: ReadonlyArray<MidiExportDiagnostic>
}>

export const defaultPitchBendRangeSemitones = 2

/**
 * Microtonal policy.
 *
 * A note whose exact pitch is not a whole semitone is written as the nearest
 * semitone plus a pitch bend on its own channel. When the required bend exceeds
 * the declared range the note is still written at the nearest semitone, but a
 * `bend-capacity` diagnostic names the event and by how much it is off. Silent
 * nearest-note substitution is not allowed: if the file cannot represent the
 * pitch, the caller is told which event and why.
 */
export const bendForSemitoneOffset = (
  offsetSemitones: number,
  rangeSemitones: number,
) => {
  const normalized = offsetSemitones / rangeSemitones
  const clamped = Math.min(1, Math.max(-1, normalized))
  return {
    value: Math.min(16_383, Math.max(0, Math.round(8192 + clamped * 8191))),
    representable: Math.abs(normalized) <= 1 + 1e-9,
  }
}

const melodicChannel = (index: number) => {
  const channel = index % 15
  return channel >= percussionChannel ? channel + 1 : channel
}

/** The exact pitch an event asks for, in fractional MIDI semitones. */
const exactMidiFor = (
  event: NoteMusicalEvent,
  instrument: InstrumentSpec,
) =>
  instrument.kind === 'native-drum'
    ? nativeDrumMidiNotes[instrument.voice]
    : (event.midiNote ?? frequencyToMidi(event.frequencyHz))

const trackForPart = (
  partId: string,
  partName: string,
  instrument: InstrumentSpec,
  events: ReadonlyArray<NoteMusicalEvent>,
  startBeat: number,
  ticksPerQuarter: number,
  partIndex: number,
  pitchBendRangeSemitones: number,
  diagnostics: Array<MidiExportDiagnostic>,
): MidiTrack => {
  const isPercussion =
    instrument.kind === 'native-drum' ||
    (instrument.kind === 'soundfont' && instrument.percussion)
  const channel = isPercussion ? percussionChannel : melodicChannel(partIndex)
  const notes: Array<MidiNote> = events
    .filter((event) => event.partId === partId)
    .map((event) => {
      const exact = exactMidiFor(event, instrument)
      const nearest = Math.min(127, Math.max(0, Math.round(exact)))
      const offset = exact - nearest
      // Percussion note numbers are drum selectors, not pitches, so bending
      // them would choose a different drum rather than retune one.
      const needsBend = !isPercussion && Math.abs(offset) > 1e-6
      const bend = needsBend
        ? bendForSemitoneOffset(offset, pitchBendRangeSemitones)
        : null

      if (bend && !bend.representable) {
        diagnostics.push(
          Object.freeze({
            code: 'bend-capacity' as const,
            eventId: event.id,
            partId,
            message: `Event ${event.id} needs a ${offset.toFixed(3)}-semitone bend, beyond the declared ${pitchBendRangeSemitones}-semitone range. It is written at MIDI note ${nearest} and will sound ${(offset - Math.sign(offset) * pitchBendRangeSemitones).toFixed(3)} semitones off.`,
          }),
        )
      }

      return {
        tick: Math.max(
          0,
          Math.round((event.absoluteBeat - startBeat) * ticksPerQuarter),
        ),
        channel,
        note: nearest,
        velocity: event.velocity,
        duration: Math.max(1, Math.round(event.durationBeats * ticksPerQuarter)),
        ...(bend ? { pitchBend: bend.value } : {}),
      }
    })

  // Pan is a per-channel control, written once at the top of the track.
  const controllers = [
    {
      channel,
      controller: 10,
      value: Math.round(((instrument.pan + 1) / 2) * 127),
    },
  ]
  const bank =
    instrument.kind === 'soundfont' && !instrument.percussion
      ? {
          program: instrument.program,
          bankMSB: Math.floor(instrument.bank / 128),
          bankLSB: instrument.bank % 128,
        }
      : {}

  return {
    name: partName,
    channel,
    controllers,
    ...bank,
    notes,
  }
}

/** Initial SMF adapter over the exact canonical events heard by the scheduler. */
export const buildPerformanceMidi = (
  performance: ExportablePerformance,
  composition: Composition,
  options: PerformanceMidiOptions = {},
) => buildPerformanceMidiWithDiagnostics(performance, composition, options).bytes

/** Same file, plus every representation warning the export produced. */
export const buildPerformanceMidiWithDiagnostics = (
  performance: ExportablePerformance,
  composition: Composition,
  options: PerformanceMidiOptions = {},
): MidiExportResult => {
  const ticksPerQuarter = Math.max(
    1,
    Math.round(options.ticksPerQuarter ?? 480),
  )
  const diagnostics: Array<MidiExportDiagnostic> = []
  const tracks = buildPerformanceMidiTracks(
    performance,
    composition,
    ticksPerQuarter,
    options.pitchBendRangeSemitones ?? defaultPitchBendRangeSemitones,
    diagnostics,
  )

  const bytes = buildMidiFile({
    ticksPerQuarter,
    microsecondsPerBeat: 60_000_000 / composition.transport.tempoBpm,
    timeSignature: {
      numerator: composition.transport.meter.beatsPerBar,
      denominator: composition.transport.meter.beatUnit,
    },
    tracks,
    name: options.name ?? composition.name,
  })

  return Object.freeze({ bytes, diagnostics: Object.freeze(diagnostics) })
}

/**
 * The minimum an exporter needs. A fresh CanonicalPerformance satisfies it, and
 * so does a Recording, which is how MG-19 exports either without the exporter
 * knowing which it has.
 */
export type ExportablePerformance = Readonly<{
  request: CanonicalPerformance['request']
  performedEvents: CanonicalPerformance['performedEvents']
}>

export const buildPerformanceMidiTracks = (
  performance: ExportablePerformance,
  composition: Composition,
  ticksPerQuarter = 480,
  pitchBendRangeSemitones = defaultPitchBendRangeSemitones,
  diagnostics: Array<MidiExportDiagnostic> = [],
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
      pitchBendRangeSemitones,
      diagnostics,
    )
  })
}

export const downloadPerformanceMidi = (
  performance: ExportablePerformance,
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
