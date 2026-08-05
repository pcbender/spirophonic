import { describe, expect, it } from 'vitest'

import type {
  Composition,
  HeadAttachmentSpec,
  MotionSpec,
  NotePartSpec,
  RingFieldSpec,
} from './composition'
import { isComposition, validateComposition } from './compositionValidation'
import { defaultComposition } from './defaultComposition'

const cloneDefault = () => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.fields = []
  composition.parts = []
  return composition
}

const ringField: RingFieldSpec = {
  id: 'field-1',
  name: 'Pitch Rings',
  enabled: true,
  kind: 'rings',
  center: { x: 0, y: 0 },
  boundaries: [
    {
      id: 'ring-1',
      name: 'Root',
      enabled: true,
      index: 0,
      kind: 'ring',
      radius: 120,
    },
  ],
}

const notePart: NotePartSpec = {
  id: 'part-1',
  name: 'Ring Notes',
  enabled: true,
  kind: 'note',
  encounterQuery: {
    kinds: ['boundary-crossing'],
    wheelIds: ['wheel-1'],
    headIds: ['head-1'],
    fieldIds: ['field-1'],
    boundaryIds: ['ring-1'],
    directions: ['outward'],
    minStrength: 0,
  },
  instrumentId: 'instrument-1',
  onset: { kind: 'encounter-time' },
  pitch: { kind: 'fixed-midi', note: 60 },
  velocity: { kind: 'encounter-strength', min: 48, max: 112, gamma: 1 },
  duration: { kind: 'fixed', beats: 0.5 },
  quantize: { gridBeats: 0.25, strength: 0.5 },
}

const motionCases: Array<[string, MotionSpec, HeadAttachmentSpec]> = [
  [
    'lissajous',
    { kind: 'lissajous', frequencyX: 3, frequencyY: 2, delta: Math.PI / 2 },
    { kind: 'lissajous', scaleX: 160, scaleY: 160, phaseX: 0, phaseY: 0 },
  ],
  [
    'rose',
    { kind: 'rose', numerator: 5, denominator: 1 },
    { kind: 'rose', radiusScale: 180, angularOffset: 0 },
  ],
  [
    'superformula',
    { kind: 'superformula', symmetry: 6, n1: 0.3, n2: 0.3, n3: 0.3 },
    { kind: 'superformula', radiusScale: 180, angularOffset: 0 },
  ],
  [
    'harmonograph',
    {
      kind: 'harmonograph',
      frequencyX: 3.01,
      frequencyY: 2,
      delta: Math.PI / 2,
      damping: 0.02,
      amplitudeX: 180,
      amplitudeY: 180,
    },
    { kind: 'harmonograph', amplitudeScale: 1, phaseX: 0, phaseY: 0 },
  ],
]

const issueAt = (value: unknown, path: string) => {
  const result = validateComposition(value)

  if (result.ok) return undefined

  return result.issues.find((issue) => issue.path === path)
}

describe('Composition validation', () => {
  it('accepts the minimal default Composition without mutating it', () => {
    const composition = cloneDefault()
    const before = structuredClone(composition)
    const result = validateComposition(composition)

    expect(result).toEqual({ ok: true, composition })
    expect(composition).toEqual(before)
  })

  it('accepts a connected Field and Part graph', () => {
    const composition = cloneDefault()

    composition.fields.push(ringField)
    composition.parts.push(notePart)

    expect(validateComposition(composition)).toEqual({
      ok: true,
      composition,
    })
  })

  it.each(motionCases)(
    'accepts the %s motion and matching attachment',
    (_, motion, attachment) => {
      const composition = cloneDefault()

      composition.wheels[0].motion = motion
      composition.wheels[0].heads[0].attachment = attachment

      expect(validateComposition(composition).ok).toBe(true)
    },
  )

  it('accepts spoke, SoundFont, native drum, and control variants', () => {
    const composition = cloneDefault()

    composition.fields.push({
      id: 'field-1',
      name: 'Meter',
      enabled: true,
      kind: 'spokes',
      center: { x: 0, y: 0 },
      rotation: 0,
      boundaries: [
        {
          id: 'spoke-1',
          name: 'Downbeat',
          enabled: true,
          index: 0,
          kind: 'spoke',
          angle: 0,
        },
      ],
    })
    composition.soundBanks.push({
      id: 'bank-1',
      name: 'Local Bank',
      digest: 'a'.repeat(64),
      format: 'sf2',
      source: 'local',
      license: 'User supplied',
      attribution: '',
    })
    composition.instruments.push(
      {
        id: 'instrument-2',
        name: 'Piano',
        kind: 'soundfont',
        gain: 0.8,
        pan: -0.1,
        soundBankId: 'bank-1',
        bank: 0,
        program: 0,
        presetName: 'Grand Piano',
        percussion: false,
        reverb: 0.2,
        chorus: 0,
      },
      {
        id: 'instrument-3',
        name: 'Kick',
        kind: 'native-drum',
        gain: 0.7,
        pan: 0.1,
        voice: 'kick',
      },
    )
    composition.parts.push({
      id: 'part-1',
      name: 'Pan Control',
      enabled: true,
      kind: 'control',
      encounterQuery: {
        kinds: ['angular-alignment'],
        wheelIds: ['wheel-1'],
        headIds: ['head-1'],
        fieldIds: [],
        boundaryIds: [],
        directions: [],
        minStrength: 0.2,
      },
      instrumentId: 'instrument-2',
      control: {
        name: 'pan',
        source: 'angle',
        min: -1,
        max: 1,
        sampleRateHz: 30,
        smoothingSeconds: 0.05,
      },
    })

    expect(validateComposition(composition)).toEqual({
      ok: true,
      composition,
    })
  })

  it('reports globally duplicated identities at the duplicate path', () => {
    const composition = cloneDefault()

    composition.instruments[0].id = 'head-1'

    expect(issueAt(composition, '$.instruments[0].id')?.message).toContain(
      'Duplicate ID "head-1"',
    )
  })

  it('reports every dangling Part reference at its own path', () => {
    const composition = cloneDefault()
    const dangling = structuredClone(notePart)

    dangling.encounterQuery.wheelIds = ['missing-wheel']
    dangling.encounterQuery.headIds = ['missing-head']
    dangling.encounterQuery.fieldIds = ['missing-field']
    dangling.encounterQuery.boundaryIds = ['missing-boundary']
    dangling.instrumentId = 'missing-instrument'
    composition.parts.push(dangling)

    const result = validateComposition(composition)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        '$.parts[0].encounterQuery.wheelIds[0]',
        '$.parts[0].encounterQuery.headIds[0]',
        '$.parts[0].encounterQuery.fieldIds[0]',
        '$.parts[0].encounterQuery.boundaryIds[0]',
        '$.parts[0].instrumentId',
      ]),
    )
  })

  it('rejects a Head attachment from another motion family', () => {
    const composition = cloneDefault()

    composition.wheels[0].heads[0].attachment = {
      kind: 'lissajous',
      scaleX: 1,
      scaleY: 1,
      phaseX: 0,
      phaseY: 0,
    }

    expect(issueAt(composition, '$.wheels[0].heads[0].attachment.kind')?.message)
      .toContain('does not match Wheel motion kind "spirogram"')
  })

  it('rejects fields from the wrong motion family instead of ignoring them', () => {
    const composition = cloneDefault()
    const motion = composition.wheels[0].motion as unknown as Record<string, unknown>

    motion.frequencyX = 3

    expect(issueAt(composition, '$.wheels[0].motion.frequencyX')?.message).toBe(
      'Unknown property.',
    )
  })

  it('enforces non-empty required object lists', () => {
    const noHeads = cloneDefault()
    const noInstruments = cloneDefault()

    noHeads.wheels[0].heads = []
    noInstruments.instruments = []

    expect(issueAt(noHeads, '$.wheels[0].heads')?.message).toContain(
      'at least 1 item',
    )
    expect(issueAt(noInstruments, '$.instruments')?.message).toContain(
      'at least 1 item',
    )
  })

  it('rejects non-finite numbers and unknown root properties', () => {
    const composition = cloneDefault()
    const value = composition as unknown as Record<string, unknown>

    composition.transport.tempoBpm = Number.NaN
    value.legacyGeometry = {}

    expect(issueAt(composition, '$.transport.tempoBpm')?.message).toBe(
      'Expected a finite number.',
    )
    expect(issueAt(composition, '$.legacyGeometry')?.message).toBe(
      'Unknown property.',
    )
  })

  it('requires SoundFont Instruments to reference a declared bank', () => {
    const composition = cloneDefault()

    composition.instruments.push({
      id: 'instrument-2',
      name: 'Piano',
      kind: 'soundfont',
      gain: 0.8,
      pan: 0,
      soundBankId: 'missing-bank',
      bank: 0,
      program: 0,
      presetName: 'Grand Piano',
      percussion: false,
      reverb: 0.2,
      chorus: 0,
    })

    expect(issueAt(composition, '$.instruments[1].soundBankId')?.message).toBe(
      'References missing SoundBank "missing-bank".',
    )
  })

  it('rejects duplicate Boundary indices within a Field', () => {
    const composition = cloneDefault()
    const field = structuredClone(ringField)

    field.boundaries.push({
      id: 'ring-2',
      name: 'Duplicate Index',
      enabled: true,
      index: 0,
      kind: 'ring',
      radius: 180,
    })
    composition.fields.push(field)

    expect(issueAt(composition, '$.fields[0].boundaries[1].index')?.message)
      .toContain('Duplicate Boundary index 0')
  })

  it('provides a type guard over the strict validator', () => {
    expect(isComposition(cloneDefault())).toBe(true)
    expect(isComposition({ version: '1.0' })).toBe(false)
  })
})
