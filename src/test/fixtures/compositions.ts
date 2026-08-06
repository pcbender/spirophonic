import { BasicSoundBank } from 'spessasynth_core'

import { sha256Hex } from '../../audio/soundbankStore'
import type {
  Composition,
  NotePartSpec,
  SoundFontInstrumentSpec,
} from '../../core/composition'
import {
  bundledSoundBank,
  defaultComposition,
  referenceComposition,
} from '../../core/defaultComposition'

/**
 * The reference Compositions MG-21 validates against.
 *
 * Every fixture is returned as a fresh deep clone, so a test may edit one
 * without leaking into the next. They are shared by the benchmarks, the audio
 * integration tests, and the browser checks, so a change in what the engine
 * considers reference work shows up in all three at once rather than drifting
 * apart per suite.
 */

const clone = (composition: Composition): Composition =>
  structuredClone(composition) as Composition

/** One Wheel, one Head, rings and spokes: the MG-09 first playable slice. */
export const ringAndSpokeComposition = (): Composition =>
  clone(defaultComposition as Composition)

/** One Wheel carrying three Heads, which must share its clock exactly. */
export const multiHeadWheelComposition = (): Composition => {
  const composition = clone(referenceComposition as Composition)
  composition.id = 'fixture-multi-head-wheel'
  composition.name = 'Multi-Head Wheel'
  composition.wheels = [composition.wheels[0]]
  // Parts that named the removed Wheels would select nothing; point them all
  // at the surviving one so every Part still contributes events.
  for (const part of composition.parts) {
    if (part.encounterQuery.wheelIds.length > 0) {
      part.encounterQuery.wheelIds = ['wheel-1']
    }
  }
  return composition
}

/** Four Wheels of three Heads each: the MG-12 concurrency reference. */
export const concurrentWheelsComposition = (): Composition =>
  clone(referenceComposition as Composition)

/**
 * Relation-driven harmony: Heads watched for conjunction and opposition, a Part
 * that plays those relation Encounters, and a Control Part tracking separation.
 */
export const relationHarmonyComposition = (): Composition => {
  const composition = clone(referenceComposition as Composition)
  composition.id = 'fixture-relation-harmony'
  composition.name = 'Relation Harmony'
  composition.relations = [
    {
      id: 'relation-conjunction',
      name: 'Heads Meet',
      enabled: true,
      kind: 'conjunction',
      headIds: [],
      threshold: 60,
      hysteresis: 12,
      minSeparationSeconds: 0.15,
    },
    {
      id: 'relation-opposition',
      name: 'Heads Oppose',
      enabled: true,
      kind: 'opposition',
      headIds: [],
      threshold: 0.25,
      hysteresis: 0.05,
      minSeparationSeconds: 0.2,
    },
  ]
  composition.tuningContexts = [
    {
      id: 'tuning-just',
      name: 'Just Intonation',
      rootFrequencyHz: 220,
      system: { kind: 'rational', maxDenominator: 32 },
      octaveFold: true,
    },
  ]

  const harmonyPart: NotePartSpec = {
    id: 'part-harmony',
    name: 'Relation Harmony',
    enabled: true,
    mute: false,
    solo: false,
    kind: 'note',
    tuningContextId: 'tuning-just',
    encounterQuery: {
      kinds: ['conjunction', 'opposition'],
      wheelIds: [],
      headIds: [],
      fieldIds: [],
      boundaryIds: [],
      directions: [],
      minStrength: 0,
      relationIds: ['relation-conjunction', 'relation-opposition'],
    },
    instrumentId: 'instrument-pad',
    onset: { kind: 'encounter-time' },
    pitch: { kind: 'boundary-degree', root: 57, scale: 'dorian', octaves: 2 },
    velocity: { kind: 'encounter-strength', min: 50, max: 110, gamma: 1 },
    duration: { kind: 'fixed', beats: 1 },
  }

  composition.parts = [
    ...composition.parts,
    harmonyPart,
    {
      id: 'part-separation',
      name: 'Separation Control',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'control',
      encounterQuery: {
        kinds: ['closest-approach'],
        wheelIds: [],
        headIds: [],
        fieldIds: [],
        boundaryIds: [],
        directions: [],
        minStrength: 0,
      },
      instrumentId: 'instrument-pad',
      control: {
        name: 'separation',
        source: 'distance',
        min: 0,
        max: 1,
        sampleRateHz: 30,
        smoothingSeconds: 0.15,
      },
    },
  ]
  return composition
}

/** Every variation layer on, at a seed that measurably changes the output. */
export const seededVariationComposition = (): Composition => {
  const composition = clone(referenceComposition as Composition)
  composition.id = 'fixture-seeded-variation'
  composition.name = 'Seeded Variation'
  composition.variation = {
    enabled: true,
    seed: 'mg-21-reference',
    initialConditions: { enabled: true, amount: 0.4 },
    interpretation: { enabled: true, amount: 0.5 },
    performance: { enabled: true, amount: 0.5 },
  }
  return composition
}

/**
 * A Composition worth recording and reinterpreting: variation is on, so the
 * recorded performed layer differs from a fresh compile and replay has
 * something to preserve.
 */
export const reinterpretationComposition = (): Composition => {
  const composition = seededVariationComposition()
  composition.id = 'fixture-reinterpretation'
  composition.name = 'Recorded Reinterpretation'
  return composition
}

/**
 * A Head observing its own retained Trace, so Trace Encounters exist to index.
 *
 * Only the leading Head of each Wheel observes. With all twelve observing, a
 * spirogram re-crosses its own path often enough to saturate the 10,000
 * Encounter cap, and the compiler then reports truncation — which makes the
 * fixture measure the limit rather than the indexing work underneath it.
 */
export const traceObservationComposition = (): Composition => {
  const composition = clone(referenceComposition as Composition)
  composition.id = 'fixture-trace-observation'
  composition.name = 'Trace Observation'
  for (const wheel of composition.wheels) {
    wheel.heads[0].observation = {
      enabled: true,
      retention: 'window',
      sampleRateHz: 120,
      maxSegments: 2048,
      allowSelf: true,
    }
  }
  composition.parts = [
    ...composition.parts,
    {
      id: 'part-trace',
      name: 'Trace Crossings',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'note',
      encounterQuery: {
        kinds: ['trace-crossing'],
        wheelIds: [],
        headIds: [],
        fieldIds: [],
        boundaryIds: [],
        directions: [],
        minStrength: 0,
      },
      instrumentId: 'instrument-lead',
      onset: { kind: 'encounter-time' },
      pitch: { kind: 'boundary-degree', root: 62, scale: 'major', octaves: 2 },
      velocity: { kind: 'constant', value: 84 },
      duration: { kind: 'fixed', beats: 0.25 },
    },
  ]
  return composition
}

/**
 * The digest the showcase's SoundFont Instrument expects.
 *
 * The showcase now points at the bundled MuseScore General bank, which is MIT
 * licensed and therefore may ship. Its bytes still stay out of Composition JSON
 * — invariant 11 — so this remains a content-addressed reference; the bytes
 * live in `public/soundbanks/` and reach the vault on their own.
 *
 * Until the download completes, MG-11's missing-bank isolation reports the
 * unresolved reference and the three native Instruments still play.
 *
 * For unit tests, see {@link sampleSoundBankBytes} — an 890-byte SoundFont
 * generated by `spessasynth_core`, small enough to use without a download.
 */
export const showcaseSoundBankDigest = bundledSoundBank.digest

/**
 * The MG-21 showcase: four Wheels of three Heads, two Fields, four Parts, and
 * four simultaneous Instruments of which one is a SoundFont.
 */
export const showcaseComposition = (): Composition => {
  const composition = clone(referenceComposition as Composition)
  composition.id = 'showcase-four-wheels'
  composition.name = 'Showcase Four Wheels'
  // Spread, not the frozen shared constant: a fixture hands back a document
  // the caller may edit.
  composition.soundBanks = [{ ...bundledSoundBank }]

  const soundFont: SoundFontInstrumentSpec = {
    id: 'instrument-pad',
    name: 'Showcase Pad',
    kind: 'soundfont',
    gain: 0.45,
    pan: -0.3,
    soundBankId: bundledSoundBank.id,
    // Bank 0, program 89 in MuseScore General is "Warm Pad" — a real preset in
    // the bank that now ships, so the showcase sounds as authored.
    bank: 0,
    program: 89,
    presetName: 'Warm Pad',
    percussion: false,
    reverb: 0.3,
    chorus: 0.2,
  }
  // Replaces the native pad in place, so the Part routing is unchanged and the
  // only difference is which backend renders it.
  composition.instruments = composition.instruments.map((instrument) =>
    instrument.id === 'instrument-pad' ? soundFont : instrument,
  )
  return composition
}

export const allReferenceCompositions = (): ReadonlyArray<
  Readonly<{ label: string; composition: Composition }>
> => [
  { label: 'ring and spoke', composition: ringAndSpokeComposition() },
  { label: 'multi-Head Wheel', composition: multiHeadWheelComposition() },
  { label: 'concurrent Wheels', composition: concurrentWheelsComposition() },
  { label: 'relation harmony', composition: relationHarmonyComposition() },
  { label: 'seeded variation', composition: seededVariationComposition() },
  { label: 'reinterpretation', composition: reinterpretationComposition() },
  { label: 'trace observation', composition: traceObservationComposition() },
  { label: 'showcase', composition: showcaseComposition() },
]

/**
 * A real, valid SoundFont for tests and benchmarks.
 *
 * `spessasynth_core` can generate one: 890 bytes of RIFF/sfbk carrying a single
 * "Saw Wave" preset, under the Apache 2.0 licence this project already depends
 * on. It is not a musically useful bank — one saw wave is not General MIDI —
 * but it is a genuine SoundFont, which means the SoundFont path can be measured
 * and heard here rather than only reasoned about.
 *
 * This does not replace a user-supplied bank for the showcase's intended sound.
 * It removes the weaker claim that the path cannot be exercised at all.
 */
export const sampleSoundBankBytes = (): ArrayBuffer =>
  BasicSoundBank.getSampleSoundBankFile()

/** SHA-256 of {@link sampleSoundBankBytes}, computed rather than hard-coded. */
export const sampleSoundBankDigest = async () =>
  sha256Hex(sampleSoundBankBytes())

/** The preset the sample bank actually carries: bank 0, program 0. */
export const sampleSoundBankPreset = Object.freeze({
  bank: 0,
  program: 0,
  name: 'Saw Wave',
})

/**
 * The showcase, pointed at the generated sample bank instead of a bank the
 * user must supply. Async because the digest is content-addressed.
 */
export const showcaseWithSampleBank = async (): Promise<Composition> => {
  const composition = showcaseComposition()
  const digest = await sampleSoundBankDigest()
  composition.soundBanks = [
    {
      id: 'bank-showcase',
      name: 'Sample Saw Bank',
      digest,
      format: 'sf2',
      source: 'local',
      license: 'Apache-2.0',
      attribution: 'Generated by spessasynth_core',
    },
  ]
  composition.instruments = composition.instruments.map((instrument) =>
    instrument.kind === 'soundfont'
      ? {
          ...instrument,
          soundBankId: 'bank-showcase',
          bank: sampleSoundBankPreset.bank,
          program: sampleSoundBankPreset.program,
          presetName: sampleSoundBankPreset.name,
        }
      : instrument,
  )
  return composition
}
