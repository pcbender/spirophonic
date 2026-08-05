import type { Composition, InstrumentSpec, NotePartSpec } from '../core/composition'
import type { CanonicalPerformance, NoteMusicalEvent } from '../core/performance'
import { frequencyToMidi, midiToName } from '../core/scales'
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
}>

const noteName = (event: NoteMusicalEvent) =>
  midiToName(Math.round(event.midiNote ?? frequencyToMidi(event.frequencyHz)))
    .toLowerCase()

const soundFor = (instrument: InstrumentSpec) => {
  if (instrument.kind === 'native-synth') return instrument.waveform
  if (instrument.kind === 'native-drum') return drumSounds[instrument.voice]
  return soundfontNames[instrument.program] ?? 'gm_piano'
}

const patternForPart = (
  part: NotePartSpec,
  instrument: InstrumentSpec,
  events: ReadonlyArray<NoteMusicalEvent>,
  performance: CanonicalPerformance,
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

  for (const event of events.filter((candidate) => candidate.partId === part.id)) {
    const slot =
      Math.round(((event.absoluteBeat - startBeat) / durationBeats) * steps) %
      steps
    const held = slots[slot]
    if (!held || event.velocity > held.velocity) slots[slot] = event
  }

  const firstEvent = slots.find((event) => event !== null)
  return Object.freeze({
    partId: part.id,
    label: part.name,
    tokens: Object.freeze(
      slots.map((event) => {
        if (!event) return REST
        return instrument.kind === 'native-drum'
          ? drumSounds[instrument.voice]
          : noteName(event)
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
  performance: CanonicalPerformance,
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
  performance: CanonicalPerformance,
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
