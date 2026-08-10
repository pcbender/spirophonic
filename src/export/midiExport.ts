import type { Composition, InstrumentSpec } from '../core/composition'
import {
  eventSounds,
  type CanonicalPerformance,
  type NoteMusicalEvent,
} from '../core/performance'
import type { GateModulationLane } from '../core/gateModulation'
import { frequencyToMidi } from '../core/scales'
import { secondsToBeats } from '../core/transport'
import {
  buildMidiFile,
  type MidiController,
  type MidiNote,
  type MidiPitchBend,
  type MidiTrack,
} from './midi/smf'

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
  code:
    | 'bend-capacity'
    | 'channel-capacity'
    | 'modulation-range'
    | 'unsupported-modulation'
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
  tempoBpm: number,
  modulationLanes: ReadonlyArray<GateModulationLane>,
  diagnostics: Array<MidiExportDiagnostic>,
): MidiTrack => {
  const isPercussion =
    instrument.kind === 'native-drum' ||
    (instrument.kind === 'soundfont' && instrument.percussion)
  const channel = isPercussion ? percussionChannel : melodicChannel(partIndex)
  const partEvents = events
    // A silenced event is a rest. MIDI has no rest to write, so it is simply
    // absent from the track rather than emitted as an audible note.
    .filter((event) => event.partId === partId && eventSounds(event))
  const lanesByEvent = new Map<string, ReadonlyArray<GateModulationLane>>()
  let modulatedUntil = Number.NEGATIVE_INFINITY
  for (const event of [...partEvents].sort(
    (left, right) => left.timeSeconds - right.timeSeconds,
  )) {
    const lanes = modulationLanes.filter(
      (lane) => lane.noteEventId === event.id,
    )
    if (lanes.length === 0) continue
    if (event.timeSeconds < modulatedUntil - 1e-9 || partIndex >= 15) {
      diagnostics.push(
        Object.freeze({
          code: 'channel-capacity' as const,
          eventId: event.id,
          partId,
          message:
            partIndex >= 15
              ? `Part ${partId} has no dedicated melodic MIDI channel for note-scoped modulation; its lane is omitted.`
              : `Event ${event.id} overlaps another modulated note on the same MIDI channel; its note is preserved but its lane is omitted.`,
        }),
      )
      continue
    }
    lanesByEvent.set(event.id, lanes)
    modulatedUntil = event.timeSeconds + event.durationSeconds
  }

  const controllers: Array<MidiController> = [
    {
      channel,
      controller: 10,
      value: Math.round(((instrument.pan + 1) / 2) * 127),
    },
  ]
  const pitchBends: Array<MidiPitchBend> = []
  const tickAt = (timeSeconds: number) =>
    Math.max(
      0,
      Math.round(
        (secondsToBeats(timeSeconds, tempoBpm) - startBeat) * ticksPerQuarter,
      ),
    )

  const notes: Array<MidiNote> = partEvents.map((event) => {
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

      const lanes = lanesByEvent.get(event.id) ?? []
      const initialVelocity = lanes.find(
        (lane) => lane.target === 'initial-velocity',
      )?.samples[0]?.value
      const eventEndTick = tickAt(
        event.timeSeconds + event.durationSeconds,
      )
      const hasPitchLane = lanes.some(
        (lane) => lane.target === 'pitch-offset',
      )

      for (const lane of lanes) {
        if (lane.target === 'initial-velocity') continue
        if (lane.target === 'gain') {
          if (lane.samples.some((sample) => sample.value > 1)) {
            diagnostics.push(
              Object.freeze({
                code: 'modulation-range' as const,
                eventId: event.id,
                partId,
                message: `MIDI controller 7 stops at gain 1.0; larger values in lane ${lane.id} are clipped.`,
              }),
            )
          }
          controllers.push(
            ...lane.samples.map((sample) => ({
              tick: tickAt(sample.timeSeconds),
              channel,
              controller: 7,
              value: Math.round(Math.min(1, Math.max(0, sample.value)) * 127),
            })),
            {
              tick: eventEndTick,
              channel,
              controller: 7,
              value: Math.round(Math.min(1, Math.max(0, instrument.gain)) * 127),
            },
          )
        } else if (lane.target === 'pan') {
          controllers.push(
            ...lane.samples.map((sample) => ({
              tick: tickAt(sample.timeSeconds),
              channel,
              controller: 10,
              value: Math.round(
                ((Math.min(1, Math.max(-1, sample.value)) + 1) / 2) * 127,
              ),
            })),
            {
              tick: eventEndTick,
              channel,
              controller: 10,
              value: Math.round(
                ((Math.min(1, Math.max(-1, instrument.pan)) + 1) / 2) * 127,
              ),
            },
          )
        } else if (lane.target === 'brightness') {
          controllers.push(
            ...lane.samples.map((sample) => ({
              tick: tickAt(sample.timeSeconds),
              channel,
              controller: 74,
              value: Math.round(Math.min(1, Math.max(0, sample.value)) * 127),
            })),
            {
              tick: eventEndTick,
              channel,
              controller: 74,
              value: 127,
            },
          )
        } else if (lane.target === 'attack') {
          const sample = lane.samples[0]
          if (sample) {
            controllers.push({
              tick: tickAt(event.timeSeconds),
              channel,
              controller: 73,
              value: Math.round(
                (Math.min(10, Math.max(0, sample.value)) / 10) * 127,
              ),
            })
            controllers.push({
              tick: eventEndTick,
              channel,
              controller: 73,
              value: 64,
            })
          }
        } else if (lane.target === 'pitch-offset') {
          if (isPercussion) {
            diagnostics.push(
              Object.freeze({
                code: 'unsupported-modulation' as const,
                eventId: event.id,
                partId,
                message: `MIDI percussion cannot apply pitch lane ${lane.id} without selecting different drums; the lane is omitted.`,
              }),
            )
            continue
          }
          let outOfRange = false
          for (const sample of lane.samples) {
            const scheduledBend = bendForSemitoneOffset(
              offset + sample.value,
              pitchBendRangeSemitones,
            )
            if (!scheduledBend.representable) outOfRange = true
            pitchBends.push({
              tick: tickAt(sample.timeSeconds),
              channel,
              value: scheduledBend.value,
            })
          }
          pitchBends.push({ tick: eventEndTick, channel, value: 8192 })
          if (outOfRange) {
            diagnostics.push(
              Object.freeze({
                code: 'modulation-range' as const,
                eventId: event.id,
                partId,
                message: `Pitch lane ${lane.id} exceeds the declared ±${pitchBendRangeSemitones}-semitone MIDI range and is clipped.`,
              }),
            )
          }
        }
      }

      if (bend && !hasPitchLane) {
        pitchBends.push(
          {
            tick: tickAt(event.timeSeconds),
            channel,
            value: bend.value,
          },
          { tick: eventEndTick, channel, value: 8192 },
        )
      }

      return {
        tick: Math.max(
          0,
          Math.round((event.absoluteBeat - startBeat) * ticksPerQuarter),
        ),
        channel,
        note: nearest,
        velocity: initialVelocity ?? event.velocity,
        duration: Math.max(1, Math.round(event.durationBeats * ticksPerQuarter)),
      }
    })
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
    pitchBends,
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
  modulationLanes: CanonicalPerformance['modulationLanes']
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
      composition.transport.tempoBpm,
      performance.modulationLanes,
      diagnostics,
    )
  })
}

export const downloadPerformanceMidi = (
  performance: ExportablePerformance,
  composition: Composition,
) => {
  const result = buildPerformanceMidiWithDiagnostics(performance, composition)
  const blob = new Blob([result.bytes as BlobPart], {
    type: 'audio/midi',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileStem(composition.name)}.mid`
  anchor.click()
  URL.revokeObjectURL(url)
  return result
}

const fileStem = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'spirophonic'
