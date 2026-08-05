import type {
  EncounterQuery,
  NotePartSpec,
  PartSpec,
  PitchMapping,
  Point2,
  SpaceSpec,
} from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
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

export const mapEncounterPitch = (
  encounter: BoundaryCrossingEncounter,
  mapping: NotePartSpec['pitch'],
  space: SpaceSpec,
  contourUnit?: number,
): MappedPitch => {
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
