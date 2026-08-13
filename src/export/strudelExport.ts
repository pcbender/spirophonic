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
  controls: ReadonlyArray<Readonly<{ method: string; values: ReadonlyArray<string> }>>
}>

export type StrudelExportDiagnostic = Readonly<{
  code: 'modulation-resolution'
  partId: string
  laneId: string
  message: string
}>

export type StrudelExportResult = Readonly<{
  code: string
  diagnostics: ReadonlyArray<StrudelExportDiagnostic>
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

const instrumentNoteName = (
  event: NoteMusicalEvent,
  instrument: InstrumentSpec,
) =>
  instrument.kind === 'soundfont' && instrument.trigger?.kind === 'one-shot'
    ? midiToName(instrument.trigger.note).toLowerCase()
    : noteName(event)

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
  diagnostics: Array<StrudelExportDiagnostic>,
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
    !(instrument.kind === 'soundfont' && instrument.trigger?.kind === 'one-shot') &&
    slots.some((event) => event !== null && !isEqualTempered(event))

  const lanes = performance.modulationLanes.filter(
    (lane) => lane.partId === part.id,
  )
  const entryVelocity = new Map(
    lanes
      .filter((lane) => lane.target === 'initial-velocity')
      .map((lane) => [lane.noteEventId, lane.samples[0]?.value]),
  )
  const methods = {
    gain: { method: 'gain', neutral: 1, map: (value: number) => value },
    pan: { method: 'pan', neutral: 0, map: (value: number) => value },
    'pitch-offset': {
      method: 'transpose',
      neutral: 0,
      map: (value: number) => value,
    },
    brightness: {
      method: 'lpf',
      neutral: 20_000,
      map: (value: number) => 80 * (20_000 / 80) ** value,
    },
    attack: { method: 'attack', neutral: 0, map: (value: number) => value },
  } as const
  const controls = new Map<string, Array<string>>()
  const occupied = new Map<string, Set<number>>()
  for (const lane of lanes) {
    if (lane.target === 'initial-velocity') continue
    const spec = methods[lane.target]
    const values = controls.get(spec.method) ??
      Array.from({ length: steps }, () => String(spec.neutral))
    const used = occupied.get(spec.method) ?? new Set<number>()
    let collapsed = false
    for (const sample of lane.samples) {
      const slot = Math.min(
        steps - 1,
        Math.max(
          0,
          Math.round(
            ((sample.timeSeconds - performance.request.startSeconds) /
              performance.request.durationSeconds) *
              steps,
          ),
        ),
      )
      if (used.has(slot)) collapsed = true
      used.add(slot)
      values[slot] = String(Number(spec.map(sample.value).toFixed(4)))
    }
    controls.set(spec.method, values)
    occupied.set(spec.method, used)
    if (collapsed || lane.samples.length > steps) {
      diagnostics.push(
        Object.freeze({
          code: 'modulation-resolution' as const,
          partId: part.id,
          laneId: lane.id,
          message: `Strudel reduced lane ${lane.id} from ${lane.samples.length} samples to the ${steps}-step pattern grid; note timing is unchanged.`,
        }),
      )
    }
  }

  return Object.freeze({
    partId: part.id,
    label: part.name,
    usesFrequency,
    tokens: Object.freeze(
      slots.map((event) => {
        if (!event) return REST
        if (instrument.kind === 'native-drum') return drumSounds[instrument.voice]
        return usesFrequency
          ? pitchToken(event)
          : instrumentNoteName(event, instrument)
      }),
    ),
    gains: Object.freeze(
      slots.map((event) =>
        event
          ? String(
              Number(
                (((entryVelocity.get(event.id) ?? event.velocity) as number) /
                  127).toFixed(2),
              ),
            )
          : REST,
      ),
    ),
    clip: Number(
      ((firstEvent?.durationBeats ?? gridBeats) / gridBeats).toFixed(3),
    ),
    sound: soundFor(instrument),
    percussion: instrument.kind === 'native-drum',
    controls: Object.freeze(
      [...controls].map(([method, values]) =>
        Object.freeze({ method, values: Object.freeze(values) }),
      ),
    ),
  })
}

export const buildPerformancePatternParts = (
  performance: ExportablePerformance,
  composition: Composition,
  diagnostics: Array<StrudelExportDiagnostic> = [],
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
          diagnostics,
        )
      }),
  )
}

export const exportPerformanceStrudel = (
  performance: ExportablePerformance,
  composition: Composition,
) => exportPerformanceStrudelWithDiagnostics(performance, composition).code

export const exportPerformanceStrudelWithDiagnostics = (
  performance: ExportablePerformance,
  composition: Composition,
): StrudelExportResult => {
  const cps = Number((1 / performance.request.durationSeconds).toFixed(6))
  const diagnostics: Array<StrudelExportDiagnostic> = []
  const parts = buildPerformancePatternParts(
    performance,
    composition,
    diagnostics,
  )
  if (parts.length === 0) {
    return Object.freeze({
      code: `setcps(${cps})\n\nsilence`,
      diagnostics: Object.freeze(diagnostics),
    })
  }

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
    const controls = part.controls
      .map((control) => `.${control.method}("${control.values.join(' ')}")`)
      .join('')
    return `  // ${part.label}\n  ${head}.gain("${gains}")${controls}${clip}`
  })

  return Object.freeze({
    code: [
      `setcps(${cps})`,
      '',
      parts.length === 1 ? code[0].trimStart() : `stack(\n${code.join(',\n')}\n)`,
    ].join('\n'),
    diagnostics: Object.freeze(diagnostics),
  })
}
