import type { Composition, InstrumentSpec, NotePartSpec } from '../core/composition'
import { eventSounds, type NoteMusicalEvent } from '../core/performance'
import { frequencyToMidi, midiToName } from '../core/scales'
import type { ExportablePerformance } from './midiExport'
import { secondsToBeats } from '../core/transport'

const REST = '~'

const drumSounds = {
  kick: 'bd',
  snare: 'sd',
  hat: 'hh',
  tom: 'mt',
  clap: 'cp',
  cymbal: 'cr',
} as const

const soundfontNames: Record<number, string> = {
  0: 'gm_piano',
  4: 'gm_epiano1',
  48: 'gm_string_ensemble_1',
  52: 'gm_choir_aahs',
  80: 'gm_lead_1_square',
  88: 'gm_pad_new_age',
  89: 'gm_pad_warm',
  91: 'gm_pad_choir',
}

export type PerformancePatternPart = Readonly<{
  partId: string
  label: string
  tokens: ReadonlyArray<string>
  gains: ReadonlyArray<string>
  clip: number
  sound: string
  percussion: boolean
  /** True when any event needed a frequency token to keep its tuning. */
  usesFrequency: boolean
}>

/** Within this many cents of a semitone, a note name is an exact description. */
export const equalTemperedToleranceCents = 1

export const isEqualTempered = (event: NoteMusicalEvent) => {
  const exact = event.midiNote ?? frequencyToMidi(event.frequencyHz)
  return Math.abs(exact - Math.round(exact)) * 100 <= equalTemperedToleranceCents
}

const noteName = (event: NoteMusicalEvent) =>
  midiToName(Math.round(event.midiNote ?? frequencyToMidi(event.frequencyHz)))
    .toLowerCase()

/**
 * A note token is a name when the event is equal-tempered and a frequency when
 * it is not. Ratio tuning cannot survive a note name, so those events emit Hz
 * rather than being rounded to the nearest semitone.
 */
const pitchToken = (event: NoteMusicalEvent) =>
  isEqualTempered(event)
    ? noteName(event)
    : String(Number(event.frequencyHz.toFixed(4)))

const soundFor = (instrument: InstrumentSpec) => {
  if (instrument.kind === 'native-synth') return instrument.waveform
  if (instrument.kind === 'native-drum') return drumSounds[instrument.voice]
  return soundfontNames[instrument.program] ?? 'gm_piano'
}

const patternForPart = (
  part: NotePartSpec,
  instrument: InstrumentSpec,
  events: ReadonlyArray<NoteMusicalEvent>,
  performance: ExportablePerformance,
  composition: Composition,
): PerformancePatternPart => {
  const startBeat = secondsToBeats(
    performance.request.startSeconds,
    composition.transport.tempoBpm,
  )
  const durationBeats = secondsToBeats(
    performance.request.durationSeconds,
    composition.transport.tempoBpm,
  )
  const gridBeats = part.quantize?.gridBeats ?? 0.25
  const steps = Math.max(1, Math.min(256, Math.round(durationBeats / gridBeats)))
  const slots: Array<NoteMusicalEvent | null> = Array.from(
    { length: steps },
    () => null,
  )

  // A silenced event leaves its slot empty, which Strudel already writes as a
  // rest token; it must not claim the slot and sound.
  for (const event of events.filter(
    (candidate) => candidate.partId === part.id && eventSounds(candidate),
  )) {
    const slot =
      Math.round(((event.absoluteBeat - startBeat) / durationBeats) * steps) %
      steps
    const held = slots[slot]
    if (!held || event.velocity > held.velocity) slots[slot] = event
  }

  const firstEvent = slots.find((event) => event !== null)
  // One pattern cannot mix note names and frequencies, so if any event needs a
  // frequency to keep its tuning, the whole part is emitted as frequencies.
  const usesFrequency =
    instrument.kind !== 'native-drum' &&
    slots.some((event) => event !== null && !isEqualTempered(event))

  return Object.freeze({
    partId: part.id,
    label: part.name,
    usesFrequency,
    tokens: Object.freeze(
      slots.map((event) => {
        if (!event) return REST
        if (instrument.kind === 'native-drum') return drumSounds[instrument.voice]
        return usesFrequency ? pitchToken(event) : noteName(event)
      }),
    ),
    gains: Object.freeze(
      slots.map((event) =>
        event ? String(Number((event.velocity / 127).toFixed(2))) : REST,
      ),
    ),
    clip: Number(
      ((firstEvent?.durationBeats ?? gridBeats) / gridBeats).toFixed(3),
    ),
    sound: soundFor(instrument),
    percussion: instrument.kind === 'native-drum',
  })
}

export const buildPerformancePatternParts = (
  performance: ExportablePerformance,
  composition: Composition,
): ReadonlyArray<PerformancePatternPart> => {
  const instruments = new Map(
    composition.instruments.map((instrument) => [instrument.id, instrument]),
  )

  return Object.freeze(
    composition.parts
      .filter((part): part is NotePartSpec => part.enabled && part.kind === 'note')
      .map((part) => {
        const instrument = instruments.get(part.instrumentId)
        if (!instrument) {
          throw new RangeError(
            `Part ${part.id} references missing instrument ${part.instrumentId}.`,
          )
        }
        return patternForPart(
          part,
          instrument,
          performance.performedEvents,
          performance,
          composition,
        )
      }),
  )
}

export const exportPerformanceStrudel = (
  performance: ExportablePerformance,
  composition: Composition,
) => {
  const cps = Number((1 / performance.request.durationSeconds).toFixed(6))
  const parts = buildPerformancePatternParts(performance, composition)
  if (parts.length === 0) return `setcps(${cps})\n\nsilence`

  const code = parts.map((part) => {
    const tokens = part.tokens.join(' ')
    const gains = part.gains.join(' ')
    const head = part.percussion
      ? `s("${tokens}")`
      : part.usesFrequency
        ? // freq() preserves exact ratio tuning that note() would round away.
          `freq("${tokens}").s("${part.sound}")`
        : `note("${tokens}").s("${part.sound}")`
    const clip = part.clip === 1 ? '' : `.clip(${part.clip})`
    return `  // ${part.label}\n  ${head}.gain("${gains}")${clip}`
  })

  return [
    `setcps(${cps})`,
    '',
    parts.length === 1 ? code[0].trimStart() : `stack(\n${code.join(',\n')}\n)`,
  ].join('\n')
}
