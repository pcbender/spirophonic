import {
  compositionVersion,
  type Composition,
  type EncounterDirection,
  type HeadAttachmentSpec,
  type MotionSpec,
  type RelationEventKind,
  type ScaleName,
} from './composition'

export type CompositionValidationIssue = {
  path: string
  message: string
}

export type CompositionValidationResult =
  | { ok: true; composition: Composition }
  | { ok: false; issues: Array<CompositionValidationIssue> }

type JsonObject = Record<string, unknown>

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
const digestPattern = /^[a-f0-9]{64}$/
const colorPattern = /^#[a-fA-F0-9]{6}$/

const motionKinds: Array<MotionSpec['kind']> = [
  'spirogram',
  'lissajous',
  'rose',
  'superformula',
  'harmonograph',
]

const attachmentKinds: Array<HeadAttachmentSpec['kind']> = [...motionKinds]

const relationEventKinds: Array<RelationEventKind> = [
  'boundary-crossing',
  'trace-crossing',
  'conjunction',
  'closest-approach',
  'radial-alignment',
  'angular-alignment',
  'opposition',
  'direction-match',
]

const encounterDirections: Array<EncounterDirection> = [
  'inward',
  'outward',
  'clockwise',
  'counterclockwise',
  'approaching',
  'receding',
]

const scaleNames: Array<ScaleName> = [
  'chromatic',
  'major',
  'minor',
  'dorian',
  'pentatonic-major',
  'pentatonic-minor',
]

class ValidationContext {
  readonly issues: Array<CompositionValidationIssue> = []
  readonly wheelIds = new Set<string>()
  readonly headIds = new Set<string>()
  readonly fieldIds = new Set<string>()
  readonly boundaryIds = new Set<string>()
  readonly soundBankIds = new Set<string>()
  readonly instrumentIds = new Set<string>()

  private readonly identities = new Map<string, string>()

  issue(path: string, message: string) {
    this.issues.push({ path, message })
  }

  object(value: unknown, path: string): JsonObject | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      this.issue(path, 'Expected an object.')
      return null
    }

    return value as JsonObject
  }

  knownKeys(value: JsonObject, path: string, keys: Array<string>) {
    const allowed = new Set(keys)

    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        this.issue(`${path}.${key}`, 'Unknown property.')
      }
    }
  }

  array(
    value: JsonObject,
    key: string,
    path: string,
    options: { min?: number; max?: number } = {},
  ): Array<unknown> | null {
    const candidate = value[key]

    if (!Array.isArray(candidate)) {
      this.issue(path, 'Expected an array.')
      return null
    }

    if (options.min !== undefined && candidate.length < options.min) {
      this.issue(path, `Expected at least ${options.min} item(s).`)
    }

    if (options.max !== undefined && candidate.length > options.max) {
      this.issue(path, `Expected at most ${options.max} item(s).`)
    }

    return candidate
  }

  string(
    value: JsonObject,
    key: string,
    path: string,
    options: { nonEmpty?: boolean; maxLength?: number; pattern?: RegExp } = {},
  ): string | null {
    const candidate = value[key]

    if (typeof candidate !== 'string') {
      this.issue(path, 'Expected a string.')
      return null
    }

    if (options.nonEmpty && candidate.trim().length === 0) {
      this.issue(path, 'Expected a non-empty string.')
    }

    if (options.maxLength !== undefined && candidate.length > options.maxLength) {
      this.issue(path, `Expected at most ${options.maxLength} characters.`)
    }

    if (options.pattern && !options.pattern.test(candidate)) {
      this.issue(path, 'Value has an invalid format.')
    }

    return candidate
  }

  number(
    value: JsonObject,
    key: string,
    path: string,
    options: {
      min?: number
      max?: number
      greaterThan?: number
      integer?: boolean
    } = {},
  ): number | null {
    const candidate = value[key]

    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
      this.issue(path, 'Expected a finite number.')
      return null
    }

    if (options.integer && !Number.isInteger(candidate)) {
      this.issue(path, 'Expected an integer.')
    }

    if (options.min !== undefined && candidate < options.min) {
      this.issue(path, `Expected a value greater than or equal to ${options.min}.`)
    }

    if (options.max !== undefined && candidate > options.max) {
      this.issue(path, `Expected a value less than or equal to ${options.max}.`)
    }

    if (options.greaterThan !== undefined && candidate <= options.greaterThan) {
      this.issue(path, `Expected a value greater than ${options.greaterThan}.`)
    }

    return candidate
  }

  boolean(value: JsonObject, key: string, path: string): boolean | null {
    const candidate = value[key]

    if (typeof candidate !== 'boolean') {
      this.issue(path, 'Expected a boolean.')
      return null
    }

    return candidate
  }

  literal<T extends string>(
    value: JsonObject,
    key: string,
    path: string,
    allowed: Array<T>,
  ): T | null {
    const candidate = value[key]

    if (typeof candidate !== 'string' || !allowed.includes(candidate as T)) {
      this.issue(path, `Expected one of: ${allowed.join(', ')}.`)
      return null
    }

    return candidate as T
  }

  id(
    value: JsonObject,
    key: string,
    path: string,
    collection?: Set<string>,
  ): string | null {
    const candidate = this.string(value, key, path, {
      nonEmpty: true,
      maxLength: 128,
      pattern: idPattern,
    })

    if (candidate === null || !idPattern.test(candidate)) {
      return candidate
    }

    const firstPath = this.identities.get(candidate)

    if (firstPath) {
      this.issue(path, `Duplicate ID "${candidate}"; first used at ${firstPath}.`)
    } else {
      this.identities.set(candidate, path)
    }

    collection?.add(candidate)
    return candidate
  }
}

export const validateComposition = (value: unknown): CompositionValidationResult => {
  const context = new ValidationContext()
  const composition = context.object(value, '$')

  if (!composition) {
    return { ok: false, issues: context.issues }
  }

  context.knownKeys(composition, '$', [
    'version',
    'id',
    'name',
    'space',
    'transport',
    'wheels',
    'fields',
    'soundBanks',
    'instruments',
    'parts',
    'variation',
  ])
  context.literal(composition, 'version', '$.version', [compositionVersion])
  context.id(composition, 'id', '$.id')
  context.string(composition, 'name', '$.name', { nonEmpty: true, maxLength: 200 })
  validateSpace(context, composition.space, '$.space')
  validateTransport(context, composition.transport, '$.transport')

  const wheels = context.array(composition, 'wheels', '$.wheels', {
    min: 1,
    max: 64,
  })
  wheels?.forEach((wheel, index) =>
    validateWheel(context, wheel, `$.wheels[${index}]`),
  )

  const fields = context.array(composition, 'fields', '$.fields', { max: 64 })
  fields?.forEach((field, index) =>
    validateField(context, field, `$.fields[${index}]`),
  )

  const soundBanks = context.array(
    composition,
    'soundBanks',
    '$.soundBanks',
    { max: 64 },
  )
  soundBanks?.forEach((soundBank, index) =>
    validateSoundBank(context, soundBank, `$.soundBanks[${index}]`),
  )

  const instruments = context.array(
    composition,
    'instruments',
    '$.instruments',
    { min: 1, max: 128 },
  )
  instruments?.forEach((instrument, index) =>
    validateInstrument(context, instrument, `$.instruments[${index}]`),
  )

  const parts = context.array(composition, 'parts', '$.parts', { max: 128 })
  parts?.forEach((part, index) =>
    validatePart(context, part, `$.parts[${index}]`),
  )

  if (composition.variation !== undefined) {
    validateVariation(context, composition.variation, '$.variation')
  }

  if (context.issues.length > 0) {
    return { ok: false, issues: context.issues }
  }

  return { ok: true, composition: value as Composition }
}

export const isComposition = (value: unknown): value is Composition =>
  validateComposition(value).ok

const validateSpace = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const space = context.object(value, path)

  if (!space) return

  context.knownKeys(space, path, ['center', 'scale'])
  validatePoint(context, space.center, `${path}.center`)
  context.number(space, 'scale', `${path}.scale`, { greaterThan: 0, max: 1_000 })
}

const validateTransport = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const transport = context.object(value, path)

  if (!transport) return

  context.knownKeys(transport, path, ['tempoBpm', 'meter', 'loop'])
  context.number(transport, 'tempoBpm', `${path}.tempoBpm`, {
    min: 20,
    max: 400,
  })

  const meter = context.object(transport.meter, `${path}.meter`)
  if (meter) {
    context.knownKeys(meter, `${path}.meter`, ['beatsPerBar', 'beatUnit'])
    context.number(meter, 'beatsPerBar', `${path}.meter.beatsPerBar`, {
      min: 1,
      max: 32,
      integer: true,
    })
    if (
      typeof meter.beatUnit === 'number' &&
      ![2, 4, 8, 16].includes(meter.beatUnit)
    ) {
      context.issue(`${path}.meter.beatUnit`, 'Expected one of: 2, 4, 8, 16.')
    } else if (typeof meter.beatUnit !== 'number') {
      context.issue(`${path}.meter.beatUnit`, 'Expected a number.')
    }
  }

  const loop = context.object(transport.loop, `${path}.loop`)
  if (loop) {
    context.knownKeys(loop, `${path}.loop`, ['startBeat', 'lengthBeats'])
    context.number(loop, 'startBeat', `${path}.loop.startBeat`, { min: 0 })
    context.number(loop, 'lengthBeats', `${path}.loop.lengthBeats`, {
      greaterThan: 0,
      max: 100_000,
    })
  }
}

const validateWheel = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const wheel = context.object(value, path)

  if (!wheel) return

  context.knownKeys(wheel, path, [
    'id',
    'name',
    'enabled',
    'center',
    'rate',
    'phase',
    'direction',
    'motion',
    'heads',
  ])
  context.id(wheel, 'id', `${path}.id`, context.wheelIds)
  context.string(wheel, 'name', `${path}.name`, { nonEmpty: true, maxLength: 200 })
  context.boolean(wheel, 'enabled', `${path}.enabled`)
  validatePoint(context, wheel.center, `${path}.center`)
  validateRate(context, wheel.rate, `${path}.rate`)
  context.number(wheel, 'phase', `${path}.phase`)
  context.literal(wheel, 'direction', `${path}.direction`, ['forward', 'reverse'])
  const motionKind = validateMotion(context, wheel.motion, `${path}.motion`)
  const heads = context.array(wheel, 'heads', `${path}.heads`, { min: 1, max: 64 })

  heads?.forEach((head, index) =>
    validateHead(context, head, `${path}.heads[${index}]`, motionKind),
  )
}

const validateRate = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const rate = context.object(value, path)

  if (!rate) return

  context.knownKeys(rate, path, ['cycles', 'beats'])
  context.number(rate, 'cycles', `${path}.cycles`, { greaterThan: 0, max: 1_000 })
  context.number(rate, 'beats', `${path}.beats`, { greaterThan: 0, max: 100_000 })
}

const validateMotion = (
  context: ValidationContext,
  value: unknown,
  path: string,
): MotionSpec['kind'] | null => {
  const motion = context.object(value, path)

  if (!motion) return null

  const kind = context.literal(motion, 'kind', `${path}.kind`, motionKinds)

  if (kind === 'spirogram') {
    context.knownKeys(motion, path, [
      'kind',
      'fixedRadius',
      'movingRadius',
      'rotation',
    ])
    context.number(motion, 'fixedRadius', `${path}.fixedRadius`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.number(motion, 'movingRadius', `${path}.movingRadius`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.literal(motion, 'rotation', `${path}.rotation`, ['inside', 'outside'])
  } else if (kind === 'lissajous') {
    context.knownKeys(motion, path, ['kind', 'frequencyX', 'frequencyY', 'delta'])
    validateFrequencies(context, motion, path)
    context.number(motion, 'delta', `${path}.delta`)
  } else if (kind === 'rose') {
    context.knownKeys(motion, path, ['kind', 'numerator', 'denominator'])
    context.number(motion, 'numerator', `${path}.numerator`, {
      min: 1,
      max: 128,
      integer: true,
    })
    context.number(motion, 'denominator', `${path}.denominator`, {
      min: 1,
      max: 128,
      integer: true,
    })
  } else if (kind === 'superformula') {
    context.knownKeys(motion, path, ['kind', 'symmetry', 'n1', 'n2', 'n3'])
    context.number(motion, 'symmetry', `${path}.symmetry`, {
      min: 0,
      max: 128,
      integer: true,
    })
    for (const key of ['n1', 'n2', 'n3']) {
      context.number(motion, key, `${path}.${key}`, { greaterThan: 0, max: 100 })
    }
  } else if (kind === 'harmonograph') {
    context.knownKeys(motion, path, [
      'kind',
      'frequencyX',
      'frequencyY',
      'delta',
      'damping',
      'amplitudeX',
      'amplitudeY',
    ])
    validateFrequencies(context, motion, path)
    context.number(motion, 'delta', `${path}.delta`)
    context.number(motion, 'damping', `${path}.damping`, { min: 0, max: 10 })
    context.number(motion, 'amplitudeX', `${path}.amplitudeX`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.number(motion, 'amplitudeY', `${path}.amplitudeY`, {
      greaterThan: 0,
      max: 100_000,
    })
  } else {
    context.knownKeys(motion, path, ['kind'])
  }

  return kind
}

const validateFrequencies = (
  context: ValidationContext,
  value: JsonObject,
  path: string,
) => {
  context.number(value, 'frequencyX', `${path}.frequencyX`, {
    greaterThan: 0,
    max: 1_000,
  })
  context.number(value, 'frequencyY', `${path}.frequencyY`, {
    greaterThan: 0,
    max: 1_000,
  })
}

const validateHead = (
  context: ValidationContext,
  value: unknown,
  path: string,
  motionKind: MotionSpec['kind'] | null,
) => {
  const head = context.object(value, path)

  if (!head) return

  context.knownKeys(head, path, [
    'id',
    'name',
    'enabled',
    'phaseOffset',
    'offset',
    'attachment',
    'trace',
  ])
  context.id(head, 'id', `${path}.id`, context.headIds)
  context.string(head, 'name', `${path}.name`, { nonEmpty: true, maxLength: 200 })
  context.boolean(head, 'enabled', `${path}.enabled`)
  context.number(head, 'phaseOffset', `${path}.phaseOffset`)
  validatePoint(context, head.offset, `${path}.offset`)
  const attachmentKind = validateAttachment(
    context,
    head.attachment,
    `${path}.attachment`,
  )

  if (motionKind && attachmentKind && motionKind !== attachmentKind) {
    context.issue(
      `${path}.attachment.kind`,
      `Attachment kind "${attachmentKind}" does not match Wheel motion kind "${motionKind}".`,
    )
  }

  validateTrace(context, head.trace, `${path}.trace`)
}

const validateAttachment = (
  context: ValidationContext,
  value: unknown,
  path: string,
): HeadAttachmentSpec['kind'] | null => {
  const attachment = context.object(value, path)

  if (!attachment) return null

  const kind = context.literal(
    attachment,
    'kind',
    `${path}.kind`,
    attachmentKinds,
  )

  if (kind === 'spirogram') {
    context.knownKeys(attachment, path, ['kind', 'penOffset'])
    context.number(attachment, 'penOffset', `${path}.penOffset`, {
      min: 0,
      max: 100_000,
    })
  } else if (kind === 'lissajous') {
    context.knownKeys(attachment, path, [
      'kind',
      'scaleX',
      'scaleY',
      'phaseX',
      'phaseY',
    ])
    context.number(attachment, 'scaleX', `${path}.scaleX`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.number(attachment, 'scaleY', `${path}.scaleY`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.number(attachment, 'phaseX', `${path}.phaseX`)
    context.number(attachment, 'phaseY', `${path}.phaseY`)
  } else if (kind === 'rose' || kind === 'superformula') {
    context.knownKeys(attachment, path, ['kind', 'radiusScale', 'angularOffset'])
    context.number(attachment, 'radiusScale', `${path}.radiusScale`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.number(attachment, 'angularOffset', `${path}.angularOffset`)
  } else if (kind === 'harmonograph') {
    context.knownKeys(attachment, path, [
      'kind',
      'amplitudeScale',
      'phaseX',
      'phaseY',
    ])
    context.number(attachment, 'amplitudeScale', `${path}.amplitudeScale`, {
      greaterThan: 0,
      max: 100_000,
    })
    context.number(attachment, 'phaseX', `${path}.phaseX`)
    context.number(attachment, 'phaseY', `${path}.phaseY`)
  } else {
    context.knownKeys(attachment, path, ['kind'])
  }

  return kind
}

const validateTrace = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const trace = context.object(value, path)

  if (!trace) return

  context.knownKeys(trace, path, [
    'visible',
    'color',
    'lineWidth',
    'opacity',
    'mode',
    'historySeconds',
  ])
  context.boolean(trace, 'visible', `${path}.visible`)
  context.string(trace, 'color', `${path}.color`, { pattern: colorPattern })
  context.number(trace, 'lineWidth', `${path}.lineWidth`, {
    greaterThan: 0,
    max: 100,
  })
  context.number(trace, 'opacity', `${path}.opacity`, { min: 0, max: 1 })
  context.literal(trace, 'mode', `${path}.mode`, ['full', 'animated'])
  context.number(trace, 'historySeconds', `${path}.historySeconds`, {
    min: 0,
    max: 100_000,
  })
}

const validateField = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const field = context.object(value, path)

  if (!field) return

  const kind = context.literal(field, 'kind', `${path}.kind`, ['rings', 'spokes'])
  const keys =
    kind === 'spokes'
      ? ['id', 'name', 'enabled', 'kind', 'center', 'rotation', 'boundaries']
      : ['id', 'name', 'enabled', 'kind', 'center', 'boundaries']
  context.knownKeys(field, path, keys)
  context.id(field, 'id', `${path}.id`, context.fieldIds)
  context.string(field, 'name', `${path}.name`, { nonEmpty: true, maxLength: 200 })
  context.boolean(field, 'enabled', `${path}.enabled`)
  validatePoint(context, field.center, `${path}.center`)

  if (kind === 'spokes') {
    context.number(field, 'rotation', `${path}.rotation`)
  }

  const boundaries = context.array(field, 'boundaries', `${path}.boundaries`, {
    min: 1,
    max: 256,
  })
  const indices = new Map<number, string>()

  boundaries?.forEach((boundary, index) => {
    const boundaryPath = `${path}.boundaries[${index}]`
    const boundaryIndex = validateBoundary(context, boundary, boundaryPath, kind)

    if (boundaryIndex !== null) {
      const firstPath = indices.get(boundaryIndex)
      if (firstPath) {
        context.issue(
          `${boundaryPath}.index`,
          `Duplicate Boundary index ${boundaryIndex}; first used at ${firstPath}.`,
        )
      } else {
        indices.set(boundaryIndex, `${boundaryPath}.index`)
      }
    }
  })
}

const validateBoundary = (
  context: ValidationContext,
  value: unknown,
  path: string,
  fieldKind: 'rings' | 'spokes' | null,
): number | null => {
  const boundary = context.object(value, path)

  if (!boundary) return null

  const expectedKind = fieldKind === 'rings' ? 'ring' : 'spoke'
  const kind = context.literal(boundary, 'kind', `${path}.kind`, ['ring', 'spoke'])
  context.knownKeys(
    boundary,
    path,
    kind === 'ring'
      ? ['id', 'name', 'enabled', 'index', 'kind', 'radius']
      : ['id', 'name', 'enabled', 'index', 'kind', 'angle'],
  )
  context.id(boundary, 'id', `${path}.id`, context.boundaryIds)
  context.string(boundary, 'name', `${path}.name`, {
    nonEmpty: true,
    maxLength: 200,
  })
  context.boolean(boundary, 'enabled', `${path}.enabled`)
  const index = context.number(boundary, 'index', `${path}.index`, {
    min: 0,
    max: 10_000,
    integer: true,
  })

  if (fieldKind && kind && kind !== expectedKind) {
    context.issue(
      `${path}.kind`,
      `Boundary kind "${kind}" does not match Field kind "${fieldKind}".`,
    )
  }

  if (kind === 'ring') {
    context.number(boundary, 'radius', `${path}.radius`, {
      greaterThan: 0,
      max: 100_000,
    })
  } else if (kind === 'spoke') {
    context.number(boundary, 'angle', `${path}.angle`)
  }

  return index
}

const validateSoundBank = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const soundBank = context.object(value, path)

  if (!soundBank) return

  context.knownKeys(soundBank, path, [
    'id',
    'name',
    'digest',
    'format',
    'source',
    'license',
    'attribution',
  ])
  context.id(soundBank, 'id', `${path}.id`, context.soundBankIds)
  context.string(soundBank, 'name', `${path}.name`, {
    nonEmpty: true,
    maxLength: 200,
  })
  context.string(soundBank, 'digest', `${path}.digest`, {
    pattern: digestPattern,
  })
  context.literal(soundBank, 'format', `${path}.format`, ['sf2', 'sf3', 'dls'])
  context.literal(soundBank, 'source', `${path}.source`, [
    'local',
    'bundled',
    'remote',
  ])
  context.string(soundBank, 'license', `${path}.license`, {
    nonEmpty: true,
    maxLength: 500,
  })
  context.string(soundBank, 'attribution', `${path}.attribution`, {
    maxLength: 2_000,
  })
}

const validateInstrument = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const instrument = context.object(value, path)

  if (!instrument) return

  const kind = context.literal(instrument, 'kind', `${path}.kind`, [
    'native-synth',
    'native-drum',
    'soundfont',
  ])
  const specificKeys =
    kind === 'native-synth'
      ? ['waveform', 'envelope']
      : kind === 'native-drum'
        ? ['voice']
        : kind === 'soundfont'
          ? [
              'soundBankId',
              'bank',
              'program',
              'presetName',
              'percussion',
              'reverb',
              'chorus',
            ]
          : []
  context.knownKeys(instrument, path, [
    'id',
    'name',
    'kind',
    'gain',
    'pan',
    ...specificKeys,
  ])
  context.id(instrument, 'id', `${path}.id`, context.instrumentIds)
  context.string(instrument, 'name', `${path}.name`, {
    nonEmpty: true,
    maxLength: 200,
  })
  context.number(instrument, 'gain', `${path}.gain`, { min: 0, max: 4 })
  context.number(instrument, 'pan', `${path}.pan`, { min: -1, max: 1 })

  if (kind === 'native-synth') {
    context.literal(instrument, 'waveform', `${path}.waveform`, [
      'sine',
      'triangle',
      'square',
      'sawtooth',
    ])
    validateEnvelope(context, instrument.envelope, `${path}.envelope`)
  } else if (kind === 'native-drum') {
    context.literal(instrument, 'voice', `${path}.voice`, [
      'kick',
      'snare',
      'hat',
      'tom',
      'clap',
      'cymbal',
    ])
  } else if (kind === 'soundfont') {
    const soundBankId = context.string(
      instrument,
      'soundBankId',
      `${path}.soundBankId`,
      { nonEmpty: true, maxLength: 128, pattern: idPattern },
    )
    if (soundBankId && !context.soundBankIds.has(soundBankId)) {
      context.issue(
        `${path}.soundBankId`,
        `References missing SoundBank "${soundBankId}".`,
      )
    }
    context.number(instrument, 'bank', `${path}.bank`, {
      min: 0,
      max: 16_383,
      integer: true,
    })
    context.number(instrument, 'program', `${path}.program`, {
      min: 0,
      max: 127,
      integer: true,
    })
    context.string(instrument, 'presetName', `${path}.presetName`, {
      nonEmpty: true,
      maxLength: 200,
    })
    context.boolean(instrument, 'percussion', `${path}.percussion`)
    context.number(instrument, 'reverb', `${path}.reverb`, { min: 0, max: 1 })
    context.number(instrument, 'chorus', `${path}.chorus`, { min: 0, max: 1 })
  }
}

const validateEnvelope = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const envelope = context.object(value, path)

  if (!envelope) return

  context.knownKeys(envelope, path, [
    'attackSeconds',
    'decaySeconds',
    'sustain',
    'releaseSeconds',
  ])
  context.number(envelope, 'attackSeconds', `${path}.attackSeconds`, {
    min: 0,
    max: 60,
  })
  context.number(envelope, 'decaySeconds', `${path}.decaySeconds`, {
    min: 0,
    max: 60,
  })
  context.number(envelope, 'sustain', `${path}.sustain`, { min: 0, max: 1 })
  context.number(envelope, 'releaseSeconds', `${path}.releaseSeconds`, {
    min: 0,
    max: 60,
  })
}

const validatePart = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const part = context.object(value, path)

  if (!part) return

  const kind = context.literal(part, 'kind', `${path}.kind`, ['note', 'control'])
  const specificKeys =
    kind === 'note'
      ? ['onset', 'pitch', 'velocity', 'duration', 'quantize']
      : kind === 'control'
        ? ['control']
        : []
  context.knownKeys(part, path, [
    'id',
    'name',
    'enabled',
    'mute',
    'solo',
    'kind',
    'encounterQuery',
    'instrumentId',
    ...specificKeys,
  ])
  context.id(part, 'id', `${path}.id`)
  context.string(part, 'name', `${path}.name`, { nonEmpty: true, maxLength: 200 })
  context.boolean(part, 'enabled', `${path}.enabled`)
  context.boolean(part, 'mute', `${path}.mute`)
  context.boolean(part, 'solo', `${path}.solo`)
  validateEncounterQuery(context, part.encounterQuery, `${path}.encounterQuery`)
  const instrumentId = context.string(part, 'instrumentId', `${path}.instrumentId`, {
    nonEmpty: true,
    maxLength: 128,
    pattern: idPattern,
  })
  if (instrumentId && !context.instrumentIds.has(instrumentId)) {
    context.issue(
      `${path}.instrumentId`,
      `References missing Instrument "${instrumentId}".`,
    )
  }

  if (kind === 'note') {
    validateOnset(context, part.onset, `${path}.onset`)
    validatePitch(context, part.pitch, `${path}.pitch`)
    validateVelocity(context, part.velocity, `${path}.velocity`)
    validateDuration(context, part.duration, `${path}.duration`)
    if (part.quantize !== undefined) {
      validateQuantize(context, part.quantize, `${path}.quantize`)
    }
  } else if (kind === 'control') {
    validateControl(context, part.control, `${path}.control`)
  }
}

const validateEncounterQuery = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const query = context.object(value, path)

  if (!query) return

  context.knownKeys(query, path, [
    'kinds',
    'wheelIds',
    'headIds',
    'fieldIds',
    'boundaryIds',
    'directions',
    'minStrength',
  ])
  validateLiteralArray(
    context,
    query,
    'kinds',
    `${path}.kinds`,
    relationEventKinds,
    { min: 1 },
  )
  validateReferenceArray(
    context,
    query,
    'wheelIds',
    `${path}.wheelIds`,
    context.wheelIds,
    'Wheel',
  )
  validateReferenceArray(
    context,
    query,
    'headIds',
    `${path}.headIds`,
    context.headIds,
    'Head',
  )
  validateReferenceArray(
    context,
    query,
    'fieldIds',
    `${path}.fieldIds`,
    context.fieldIds,
    'Field',
  )
  validateReferenceArray(
    context,
    query,
    'boundaryIds',
    `${path}.boundaryIds`,
    context.boundaryIds,
    'Boundary',
  )
  validateLiteralArray(
    context,
    query,
    'directions',
    `${path}.directions`,
    encounterDirections,
  )
  context.number(query, 'minStrength', `${path}.minStrength`, { min: 0, max: 1 })
}

const validateReferenceArray = (
  context: ValidationContext,
  value: JsonObject,
  key: string,
  path: string,
  known: Set<string>,
  label: string,
) => {
  const references = context.array(value, key, path, { max: 256 })
  const seen = new Set<string>()

  references?.forEach((reference, index) => {
    const referencePath = `${path}[${index}]`
    if (typeof reference !== 'string' || !idPattern.test(reference)) {
      context.issue(referencePath, 'Expected a valid ID string.')
      return
    }
    if (seen.has(reference)) {
      context.issue(referencePath, `Duplicate reference "${reference}".`)
    }
    seen.add(reference)
    if (!known.has(reference)) {
      context.issue(referencePath, `References missing ${label} "${reference}".`)
    }
  })
}

const validateLiteralArray = <T extends string>(
  context: ValidationContext,
  value: JsonObject,
  key: string,
  path: string,
  allowed: Array<T>,
  options: { min?: number } = {},
) => {
  const items = context.array(value, key, path, { min: options.min, max: 256 })
  const seen = new Set<string>()

  items?.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    if (typeof item !== 'string' || !allowed.includes(item as T)) {
      context.issue(itemPath, `Expected one of: ${allowed.join(', ')}.`)
      return
    }
    if (seen.has(item)) {
      context.issue(itemPath, `Duplicate value "${item}".`)
    }
    seen.add(item)
  })
}

const validateOnset = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const onset = context.object(value, path)
  if (!onset) return
  context.knownKeys(onset, path, ['kind'])
  context.literal(onset, 'kind', `${path}.kind`, ['encounter-time'])
}

const validatePitch = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const pitch = context.object(value, path)
  if (!pitch) return
  const kind = context.literal(pitch, 'kind', `${path}.kind`, [
    'fixed-midi',
    'fixed-frequency',
    'boundary-degree',
    'ratio',
    'spatial',
    'contour',
  ])

  if (kind === 'fixed-midi') {
    context.knownKeys(pitch, path, ['kind', 'note'])
    context.number(pitch, 'note', `${path}.note`, { min: 0, max: 127, integer: true })
  } else if (kind === 'fixed-frequency') {
    context.knownKeys(pitch, path, ['kind', 'frequencyHz'])
    context.number(pitch, 'frequencyHz', `${path}.frequencyHz`, {
      greaterThan: 0,
      max: 40_000,
    })
  } else if (kind === 'ratio') {
    context.knownKeys(pitch, path, ['kind', 'rootFrequencyHz', 'octaveFold'])
    context.number(pitch, 'rootFrequencyHz', `${path}.rootFrequencyHz`, {
      greaterThan: 0,
      max: 40_000,
    })
    context.boolean(pitch, 'octaveFold', `${path}.octaveFold`)
  } else if (kind === 'boundary-degree') {
    context.knownKeys(pitch, path, ['kind', 'root', 'scale', 'octaves'])
    validateScalePitch(context, pitch, path)
  } else if (kind === 'spatial' || kind === 'contour') {
    context.knownKeys(pitch, path, ['kind', 'source', 'root', 'scale', 'octaves'])
    context.literal(pitch, 'source', `${path}.source`, ['x', 'y', 'radius', 'angle'])
    validateScalePitch(context, pitch, path)
  } else {
    context.knownKeys(pitch, path, ['kind'])
  }
}

const validateScalePitch = (
  context: ValidationContext,
  value: JsonObject,
  path: string,
) => {
  context.number(value, 'root', `${path}.root`, { min: 0, max: 127, integer: true })
  context.literal(value, 'scale', `${path}.scale`, scaleNames)
  context.number(value, 'octaves', `${path}.octaves`, {
    min: 0,
    max: 10,
    integer: true,
  })
}

const validateVelocity = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const velocity = context.object(value, path)
  if (!velocity) return
  const kind = context.literal(velocity, 'kind', `${path}.kind`, [
    'constant',
    'encounter-strength',
  ])

  if (kind === 'constant') {
    context.knownKeys(velocity, path, ['kind', 'value'])
    context.number(velocity, 'value', `${path}.value`, {
      min: 1,
      max: 127,
      integer: true,
    })
  } else if (kind === 'encounter-strength') {
    context.knownKeys(velocity, path, ['kind', 'min', 'max', 'gamma'])
    const min = context.number(velocity, 'min', `${path}.min`, {
      min: 1,
      max: 127,
      integer: true,
    })
    const max = context.number(velocity, 'max', `${path}.max`, {
      min: 1,
      max: 127,
      integer: true,
    })
    context.number(velocity, 'gamma', `${path}.gamma`, {
      greaterThan: 0,
      max: 10,
    })
    if (min !== null && max !== null && min > max) {
      context.issue(`${path}.max`, 'Expected max to be greater than or equal to min.')
    }
  } else {
    context.knownKeys(velocity, path, ['kind'])
  }
}

const validateDuration = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const duration = context.object(value, path)
  if (!duration) return
  const kind = context.literal(duration, 'kind', `${path}.kind`, [
    'fixed',
    'inside-band',
    'until-next',
  ])

  if (kind === 'fixed') {
    context.knownKeys(duration, path, ['kind', 'beats'])
    context.number(duration, 'beats', `${path}.beats`, {
      greaterThan: 0,
      max: 10_000,
    })
  } else if (kind === 'inside-band') {
    context.knownKeys(duration, path, ['kind'])
  } else if (kind === 'until-next') {
    context.knownKeys(duration, path, ['kind', 'maxBeats'])
    context.number(duration, 'maxBeats', `${path}.maxBeats`, {
      greaterThan: 0,
      max: 10_000,
    })
  } else {
    context.knownKeys(duration, path, ['kind'])
  }
}

const validateQuantize = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const quantize = context.object(value, path)
  if (!quantize) return
  context.knownKeys(quantize, path, ['gridBeats', 'strength'])
  context.number(quantize, 'gridBeats', `${path}.gridBeats`, {
    greaterThan: 0,
    max: 10_000,
  })
  context.number(quantize, 'strength', `${path}.strength`, { min: 0, max: 1 })
}

const validateControl = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const control = context.object(value, path)
  if (!control) return
  context.knownKeys(control, path, [
    'name',
    'source',
    'min',
    'max',
    'sampleRateHz',
    'smoothingSeconds',
  ])
  context.string(control, 'name', `${path}.name`, {
    nonEmpty: true,
    maxLength: 128,
  })
  context.literal(control, 'source', `${path}.source`, [
    'distance',
    'angle',
    'approach-rate',
    'rotation-rate',
    'strength',
  ])
  const min = context.number(control, 'min', `${path}.min`)
  const max = context.number(control, 'max', `${path}.max`)
  if (min !== null && max !== null && min > max) {
    context.issue(`${path}.max`, 'Expected max to be greater than or equal to min.')
  }
  context.number(control, 'sampleRateHz', `${path}.sampleRateHz`, {
    greaterThan: 0,
    max: 1_000,
  })
  context.number(control, 'smoothingSeconds', `${path}.smoothingSeconds`, {
    min: 0,
    max: 60,
  })
}

const validateVariation = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const variation = context.object(value, path)
  if (!variation) return
  context.knownKeys(variation, path, ['enabled', 'seed'])
  context.boolean(variation, 'enabled', `${path}.enabled`)
  context.string(variation, 'seed', `${path}.seed`, {
    nonEmpty: true,
    maxLength: 256,
  })
}

const validatePoint = (
  context: ValidationContext,
  value: unknown,
  path: string,
) => {
  const point = context.object(value, path)

  if (!point) return

  context.knownKeys(point, path, ['x', 'y'])
  context.number(point, 'x', `${path}.x`)
  context.number(point, 'y', `${path}.y`)
}
