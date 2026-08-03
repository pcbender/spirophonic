/**
 * A dependency-free Standard MIDI File writer, limited to what Spirophonic
 * emits: a format 1 file whose first track carries tempo and meter and whose
 * remaining tracks carry notes.
 */

export type MidiNote = {
  tick: number
  channel: number
  note: number
  velocity: number
  duration: number
}

export type MidiTrack = {
  name: string
  notes: Array<MidiNote>
}

export type TimeSignature = {
  numerator: number
  denominator: number
}

export type MidiFileOptions = {
  ticksPerQuarter: number
  microsecondsPerBeat: number
  timeSignature: TimeSignature
  tracks: Array<MidiTrack>
  name?: string
}

const HEADER_TYPE = [0x4d, 0x54, 0x68, 0x64] // "MThd"
const TRACK_TYPE = [0x4d, 0x54, 0x72, 0x6b] // "MTrk"
const META = 0xff
const META_NAME = 0x03
const META_TEMPO = 0x51
const META_TIME_SIGNATURE = 0x58
const META_END_OF_TRACK = 0x2f
const NOTE_OFF = 0x80
const NOTE_ON = 0x90

export const encodeVariableLength = (value: number): Array<number> => {
  let remaining = Math.max(0, Math.floor(value))
  const bytes = [remaining & 0x7f]

  remaining >>>= 7

  while (remaining > 0) {
    bytes.push((remaining & 0x7f) | 0x80)
    remaining >>>= 7
  }

  return bytes.reverse()
}

export const decodeVariableLength = (bytes: ArrayLike<number>, offset = 0) => {
  let value = 0
  let length = 0

  for (;;) {
    const byte = bytes[offset + length]

    length += 1
    value = value * 128 + (byte & 0x7f)

    if ((byte & 0x80) === 0) {
      break
    }
  }

  return { value, length }
}

export const buildMidiFile = (options: MidiFileOptions): Uint8Array => {
  const tracks = [buildTempoTrack(options), ...options.tracks.map(buildNoteTrack)]
  const header = [
    ...HEADER_TYPE,
    ...uint32(6),
    ...uint16(1), // format 1: one tempo track plus one track per part
    ...uint16(tracks.length),
    ...uint16(Math.max(1, Math.round(options.ticksPerQuarter))),
  ]

  return Uint8Array.from(tracks.reduce((bytes, track) => [...bytes, ...track], header))
}

const buildTempoTrack = (options: MidiFileOptions) => {
  const { numerator, denominator } = options.timeSignature
  const payload = [
    ...event(0, metaText(META_NAME, options.name ?? 'Spirophonic')),
    ...event(0, [
      META,
      META_TIME_SIGNATURE,
      0x04,
      clampByte(numerator),
      Math.round(Math.log2(Math.max(1, denominator))),
      0x18, // 24 MIDI clocks per metronome tick
      0x08, // 8 demisemiquavers per quarter note
    ]),
    ...event(0, [
      META,
      META_TEMPO,
      0x03,
      ...uint24(Math.round(options.microsecondsPerBeat)),
    ]),
    ...event(0, [META, META_END_OF_TRACK, 0x00]),
  ]

  return chunk(payload)
}

const buildNoteTrack = (track: MidiTrack) => {
  const messages = track.notes.flatMap((note) => {
    const channel = clampChannel(note.channel)
    const pitch = clampByte(note.note)
    const start = Math.max(0, Math.round(note.tick))
    const end = start + Math.max(1, Math.round(note.duration))

    return [
      { tick: start, order: 1, bytes: [NOTE_ON | channel, pitch, clampVelocity(note.velocity)] },
      { tick: end, order: 0, bytes: [NOTE_OFF | channel, pitch, 0x40] },
    ]
  })

  // A note-off at the same tick as a note-on is written first, so retriggering
  // one drum does not cut the hit that just started.
  const ordered = messages.sort(
    (left, right) => left.tick - right.tick || left.order - right.order,
  )

  let previousTick = 0
  const payload: Array<number> = [...event(0, metaText(META_NAME, track.name))]

  for (const message of ordered) {
    payload.push(...event(message.tick - previousTick, message.bytes))
    previousTick = message.tick
  }

  payload.push(...event(0, [META, META_END_OF_TRACK, 0x00]))

  return chunk(payload)
}

const chunk = (payload: Array<number>) => [
  ...TRACK_TYPE,
  ...uint32(payload.length),
  ...payload,
]

const event = (delta: number, bytes: Array<number>) => [
  ...encodeVariableLength(delta),
  ...bytes,
]

const metaText = (kind: number, text: string) => {
  const bytes = [...text].map((character) => character.charCodeAt(0) & 0x7f)

  return [META, kind, ...encodeVariableLength(bytes.length), ...bytes]
}

const uint16 = (value: number) => [(value >> 8) & 0xff, value & 0xff]

const uint24 = (value: number) => [
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
]

const uint32 = (value: number) => [
  (value >>> 24) & 0xff,
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
]

const clampByte = (value: number) => Math.min(127, Math.max(0, Math.round(value)))

const clampVelocity = (value: number) => Math.min(127, Math.max(1, Math.round(value)))

const clampChannel = (value: number) => Math.min(15, Math.max(0, Math.round(value)))
