import type {
  Composition,
  EncounterQuery,
  NotePartSpec,
  PartSpec,
  PitchMapping,
  Point2,
  SpaceSpec,
} from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
import type { RelationEncounter } from './relations'
import { buildMelodicContour, normalizeSeries } from './melody'
import {
  findTuningContext,
  frequencyForRatio,
  resolveRatioSource,
} from './tuning'
import {
  frequencyToMidi,
  midiToFrequency,
  scaleMidiForDegree,
  scaleMidiForUnitValue,
} from './scales'

export type PartMappingIssue = Readonly<{
  path: string
  message: string
}>

export type MappedPitch = Readonly<{
  frequencyHz: number
  midiNote?: number
}>

const TAU = Math.PI * 2
const epsilon = 1e-12

const includesOrAny = <T>(values: ReadonlyArray<T>, candidate: T) =>
  values.length === 0 || values.includes(candidate)

export const encounterMatchesQuery = (
  encounter: BoundaryCrossingEncounter,
  query: EncounterQuery,
) =>
  includesOrAny(query.kinds, encounter.kind) &&
  includesOrAny(query.wheelIds, encounter.wheelId) &&
  includesOrAny(query.headIds, encounter.headId) &&
  includesOrAny(query.fieldIds, encounter.fieldId) &&
  includesOrAny(query.boundaryIds, encounter.boundaryId) &&
  includesOrAny(query.directions, encounter.direction) &&
  encounter.strength >= query.minStrength

/**
 * A relation belongs to two Heads at once, so a Wheel or Head filter matches
 * when *either* subject qualifies. Filtering on one Head therefore selects the
 * relations that Head takes part in, whichever side of the pair it is on.
 */
export const relationMatchesQuery = (
  encounter: RelationEncounter,
  query: EncounterQuery,
) =>
  includesOrAny(query.kinds, encounter.kind) &&
  (query.wheelIds.length === 0 ||
    query.wheelIds.includes(encounter.wheelId) ||
    query.wheelIds.includes(encounter.partnerWheelId)) &&
  (query.headIds.length === 0 ||
    query.headIds.includes(encounter.headId) ||
    query.headIds.includes(encounter.partnerHeadId)) &&
  includesOrAny(query.relationIds ?? [], encounter.relationId) &&
  includesOrAny(query.directions, encounter.direction) &&
  encounter.strength >= query.minStrength

export const selectPartRelations = (
  part: PartSpec,
  encounters: ReadonlyArray<RelationEncounter>,
): ReadonlyArray<RelationEncounter> =>
  part.enabled
    ? Object.freeze(
        encounters.filter((encounter) =>
          relationMatchesQuery(encounter, part.encounterQuery),
        ),
      )
    : Object.freeze([])

export const selectPartEncounters = (
  part: PartSpec,
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
): ReadonlyArray<BoundaryCrossingEncounter> =>
  part.enabled
    ? Object.freeze(
        encounters.filter((encounter) =>
          encounterMatchesQuery(encounter, part.encounterQuery),
        ),
      )
    : Object.freeze([])

const relativePoint = (
  encounter: BoundaryCrossingEncounter,
  space: SpaceSpec,
): Point2 => ({
  x: encounter.position.x - space.center.x,
  y: encounter.position.y - space.center.y,
})

export const encounterSpatialSource = (
  encounter: BoundaryCrossingEncounter,
  source: 'x' | 'y' | 'radius' | 'angle',
  space: SpaceSpec,
) => {
  const relative = relativePoint(encounter, space)

  if (source === 'x') return relative.x
  if (source === 'y') return relative.y
  if (source === 'radius') return Math.hypot(relative.x, relative.y)
  return Math.atan2(relative.y, relative.x)
}

export const encounterSpatialUnit = (
  encounter: BoundaryCrossingEncounter,
  source: 'x' | 'y' | 'radius' | 'angle',
  space: SpaceSpec,
) => {
  const value = encounterSpatialSource(encounter, source, space)
  const scale = Math.max(epsilon, space.scale)

  if (source === 'angle') return ((value / TAU) % 1 + 1) % 1
  if (source === 'radius') return value / (value + scale)

  return 0.5 + Math.atan(value / scale) / Math.PI
}

export const normalizeEncounterContour = (
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
  source: 'x' | 'y' | 'radius' | 'angle',
  space: SpaceSpec,
): ReadonlyArray<number> => {
  const values = encounters.map((encounter) =>
    encounterSpatialSource(encounter, source, space),
  )
  if (values.length === 0) return Object.freeze([])

  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low
  const relativeTolerance = Math.max(Math.abs(low), Math.abs(high), 1) * 1e-9

  return Object.freeze(
    span <= relativeTolerance
      ? values.map(() => 0.5)
      : values.map((value) => (value - low) / span),
  )
}

const scalePitch = (
  midiNote: number,
  mapping: Extract<
    PitchMapping,
    { kind: 'boundary-degree' | 'spatial' | 'contour' }
  >,
): MappedPitch => {
  if (!Number.isFinite(midiNote) || midiNote < 0 || midiNote > 127) {
    throw new RangeError(
      `Part pitch mapping ${mapping.kind} produced MIDI note ${midiNote}; expected 0 through 127.`,
    )
  }

  return Object.freeze({ midiNote, frequencyHz: midiToFrequency(midiNote) })
}

export type PitchMappingContext = Readonly<{
  composition: Composition
  tuningContextId?: string
  /** Precomputed melodic line, indexed alongside the Part's Encounters. */
  melodyMidiNote?: number
}>

export const mapEncounterPitch = (
  encounter: BoundaryCrossingEncounter,
  mapping: NotePartSpec['pitch'],
  space: SpaceSpec,
  contourUnit?: number,
  context?: PitchMappingContext,
): MappedPitch => {
  if (mapping.kind === 'tuned-ratio') {
    if (!context) {
      throw new RangeError('A tuned-ratio pitch mapping needs a tuning context.')
    }
    const resolved = resolveRatioSource(context.composition, mapping.ratio)
    if (!resolved.ok) {
      // Reporting why beats silently substituting some default scale.
      throw new RangeError(resolved.reason)
    }
    const tuning = findTuningContext(context.composition, context.tuningContextId)
    const frequencyHz = frequencyForRatio(tuning, resolved.ratio)
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0 || frequencyHz > 40_000) {
      throw new RangeError(
        `Tuned ratio produced ${frequencyHz} Hz; expected a positive value at most 40000 Hz.`,
      )
    }
    return Object.freeze({
      frequencyHz,
      midiNote: frequencyToMidi(frequencyHz),
    })
  }

  if (mapping.kind === 'melodic-contour') {
    if (context?.melodyMidiNote === undefined) {
      throw new RangeError(
        'A melodic-contour pitch mapping needs a precomputed contour line.',
      )
    }
    const midiNote = context.melodyMidiNote
    if (!Number.isFinite(midiNote) || midiNote < 0 || midiNote > 127) {
      throw new RangeError(
        `Melodic contour produced MIDI note ${midiNote}; expected 0 through 127.`,
      )
    }
    return Object.freeze({ midiNote, frequencyHz: midiToFrequency(midiNote) })
  }

  if (mapping.kind === 'fixed-midi') {
    return Object.freeze({
      midiNote: mapping.note,
      frequencyHz: midiToFrequency(mapping.note),
    })
  }
  if (mapping.kind === 'fixed-frequency') {
    return Object.freeze({ frequencyHz: mapping.frequencyHz })
  }
  if (mapping.kind === 'boundary-degree') {
    return scalePitch(
      scaleMidiForDegree(
        encounter.boundaryIndex,
        mapping.scale,
        mapping.root,
        mapping.octaves,
      ),
      mapping,
    )
  }
  if (mapping.kind === 'ratio') {
    let frequencyHz =
      mapping.rootFrequencyHz * Math.max(1, encounter.boundaryIndex + 1)

    if (mapping.octaveFold) {
      while (frequencyHz >= mapping.rootFrequencyHz * 2) frequencyHz /= 2
      while (frequencyHz < mapping.rootFrequencyHz) frequencyHz *= 2
    }
    if (!Number.isFinite(frequencyHz) || frequencyHz > 40_000) {
      throw new RangeError(
        `Part ratio pitch produced ${frequencyHz} Hz; expected at most 40000 Hz.`,
      )
    }

    return Object.freeze({
      frequencyHz,
      midiNote: frequencyToMidi(frequencyHz),
    })
  }

  const unit =
    mapping.kind === 'contour'
      ? contourUnit
      : encounterSpatialUnit(encounter, mapping.source, space)
  if (unit === undefined) {
    throw new RangeError('Contour pitch mapping requires a normalized contour.')
  }

  return scalePitch(
    scaleMidiForUnitValue(
      unit,
      mapping.scale,
      mapping.root,
      mapping.octaves,
    ),
    mapping,
  )
}

/** The melodic line a Part's Encounters walk, or undefined if it has none. */
export const buildPartMelody = (
  part: NotePartSpec,
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
  space: SpaceSpec,
): ReadonlyArray<number> | undefined => {
  if (part.pitch.kind !== 'melodic-contour') return undefined

  const series = normalizeSeries(
    encounters.map((encounter) =>
      encounterSpatialSource(encounter, part.pitch.kind === 'melodic-contour' ? part.pitch.source : 'radius', space),
    ),
  )
  return buildMelodicContour(
    series,
    part.pitch.contour,
    part.pitch.scale,
    // Degree 0 sits at the contour's low bound, expressed from middle C.
    60,
  ).map((step) => step.midiNote)
}

export const validatePartMusicalRange = (
  part: PartSpec,
  path: string,
): ReadonlyArray<PartMappingIssue> => {
  if (part.kind !== 'note') return Object.freeze([])

  const mapping = part.pitch
  if (
    mapping.kind !== 'boundary-degree' &&
    mapping.kind !== 'spatial' &&
    mapping.kind !== 'contour'
  ) {
    return Object.freeze([])
  }

  const highestExclusive = mapping.root + mapping.octaves * 12

  return highestExclusive > 128
    ? Object.freeze([
        Object.freeze({
          path: `${path}.pitch.octaves`,
          message: `The declared scale range extends above MIDI note 127 (exclusive upper bound ${highestExclusive}).`,
        }),
      ])
    : Object.freeze([])
}
