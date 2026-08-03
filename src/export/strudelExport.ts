import type { SpirophonicModel, Voice } from '../core/model'
import { midiToName, toScaleDegree, type ScaleName } from '../core/scales'
import { getEffectiveCyclesPerSecond } from '../core/time'
import { renderVoices, type RenderedVoice } from '../core/voices'

const REST = '~'

/** General MIDI percussion notes as the sample names Strudel ships with. */
const drumSounds: Record<number, string> = {
  35: 'bd',
  36: 'bd',
  37: 'rim',
  38: 'sd',
  39: 'cp',
  40: 'sd',
  41: 'lt',
  42: 'hh',
  43: 'lt',
  44: 'hh',
  45: 'lt',
  46: 'oh',
  47: 'mt',
  48: 'ht',
  49: 'cr',
  50: 'ht',
  51: 'rd',
  53: 'rd',
  54: 'tb',
  56: 'cb',
  69: 'sh',
  75: 'perc',
}

/**
 * Scale types as TonalJS names them, which is the vocabulary Strudel's
 * scale() resolves against. An unknown name resolves to nothing and the voice
 * plays silently, so these are the exact strings from tonal's scale-type data.
 */
const tonalScales: Record<ScaleName, string> = {
  chromatic: 'chromatic',
  major: 'major',
  minor: 'minor',
  dorian: 'dorian',
  'pentatonic-major': 'major pentatonic',
  'pentatonic-minor': 'minor pentatonic',
}

const strudelInstruments: Record<number, string> = {
  0: 'gm_piano',
  4: 'gm_epiano1',
  48: 'gm_string_ensemble_1',
  52: 'gm_choir_aahs',
  80: 'gm_lead_1_square',
  88: 'gm_pad_new_age',
  89: 'gm_pad_warm',
  91: 'gm_pad_choir',
}

export const exportStrudelSnippet = (model: SpirophonicModel) => {
  const cps = Number(
    getEffectiveCyclesPerSecond(model.time.cyclesPerSecond).toFixed(3),
  )
  const parts = renderVoices(model).map((rendered) => ({
    label: `// ${rendered.voice.name}`,
    code: voicePart(rendered, model),
  }))

  if (parts.length === 0) {
    return [`setcps(${cps})`, '', 'silence'].join('\n')
  }

  // The label goes above its part, never trailing it: a comma after a trailing
  // comment would be commented out and the stack would not parse.
  const body =
    parts.length === 1
      ? `${parts[0].label}\n${parts[0].code}`
      : `stack(\n${parts
          .map((part) => `  ${part.label}\n  ${part.code}`)
          .join(',\n')}\n)`

  return [`setcps(${cps})`, '', body].join('\n')
}

const voicePart = ({ voice, notes }: RenderedVoice, model: SpirophonicModel) => {
  const steps = Math.min(64, Math.max(1, Math.round(voice.quantize.divisions)))
  const slots: Array<{ token: string; gain: number; velocity: number } | null> =
    Array.from({ length: steps }, () => null)

  for (const note of notes) {
    const slot = Math.round(note.t * steps) % steps
    const held = slots[slot]

    // Two onsets can round into one step; the louder is the one that reads.
    if (held && held.velocity >= note.velocity) {
      continue
    }

    slots[slot] = {
      token:
        voice.kind === 'percussion'
          ? (drumSounds[note.note] ?? 'perc')
          : String(toScaleDegree(note.note, voice.pitch.scale, voice.pitch.root)),
      gain: Number((note.velocity / 127).toFixed(2)),
      velocity: note.velocity,
    }
  }

  const tokens = slots.map((slot) => slot?.token ?? REST).join(' ')
  const gains = slots.map((slot) => (slot ? String(slot.gain) : REST)).join(' ')
  const head =
    voice.kind === 'percussion'
      ? `s("${tokens}")`
      : `n("${tokens}").scale("${scaleName(voice)}").s("${instrument(voice, model)}")`

  // clip() multiplies a note's length by its step, which is exactly what gate
  // means to the MIDI writer. Emitting it only when it does something keeps
  // the common case readable.
  const clip = voice.gate === 1 ? '' : `.clip(${Number(voice.gate.toFixed(3))})`

  return `${head}.gain("${gains}")${clip}`
}

/**
 * Strudel parses a scale as `root:type` and cannot see spaces, because a space
 * would make the argument a multi-step pattern. Its documented escape is to
 * write every space as another colon: "minor pentatonic" is `minor:pentatonic`.
 */
const scaleName = (voice: Voice) =>
  [
    midiToName(voice.pitch.root).toLowerCase(),
    ...tonalScales[voice.pitch.scale].split(' '),
  ].join(':')

/**
 * Falls back to the model's own waveform, which Strudel accepts as a basic
 * oscillator, so a snippet still plays for a program with no named soundfont.
 */
const instrument = (voice: Voice, model: SpirophonicModel) =>
  (voice.program === undefined ? undefined : strudelInstruments[voice.program]) ??
  model.sound.waveform
