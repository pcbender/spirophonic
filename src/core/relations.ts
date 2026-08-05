import type {
  Composition,
  EncounterDirection,
  Point2,
  RelationKind,
  RelationSpec,
} from './composition'
import { headStateAt, type HeadState } from './heads'
import {
  iterateTimeGrid,
  transportAddressAtSeconds,
  type PerformanceRequest,
} from './transport'

const TAU = Math.PI * 2
const epsilon = 1e-12

export type RelationDirection = Extract<
  EncounterDirection,
  'approaching' | 'receding'
>

/**
 * Measurements for an ordered Head pair (A, B). A is always the
 * lexicographically smaller Head id, so a pair has one canonical orientation.
 *
 * Swap rule, for the MG-14 acceptance criterion:
 * - `distance`, `radiusDifference`, and `speedDifference` are symmetric and are
 *   unchanged by swapping A and B.
 * - `angle` is the bearing from A to B, so swapping adds pi.
 * - `approachRate` is the time derivative of a symmetric quantity, so it is
 *   also unchanged.
 * - `rotationRate` is the signed angular velocity of B about A; swapping
 *   preserves its magnitude and sign because both endpoints move together, but
 *   `angle` is what encodes the orientation.
 */
export type RelationMeasurement = Readonly<{
  timeSeconds: number
  headAId: string
  headBId: string
  distance: number
  angle: number
  approachRate: number
  rotationRate: number
  radiusDifference: number
  angularDifference: number
  speedDifference: number
  directionDifference: number
}>

export type RelationEncounter = Readonly<{
  id: string
  kind: RelationKind
  relationId: string
  timeSeconds: number
  subjectIds: readonly [string, string]
  wheelId: string
  headId: string
  partnerWheelId: string
  partnerHeadId: string
  position: Readonly<Point2>
  direction: RelationDirection
  strength: number
  speed: number
  measurement: RelationMeasurement
  wheelPhase: number
  absoluteBeat: number
  barIndex: number
  beatInBar: number
  barPhase: number
}>

export type RelationDiagnostic = Readonly<{
  code: 'unknown-head' | 'insufficient-pairs' | 'maximum-relation-count'
  relationId: string
  message: string
}>

export type RelationScanResult = Readonly<{
  encounters: ReadonlyArray<RelationEncounter>
  diagnostics: ReadonlyArray<RelationDiagnostic>
}>

export type RelationScanOptions = Readonly<{
  maxEncounters?: number
}>

export const relationScanDefaults = Object.freeze({ maxEncounters: 10_000 })

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

const freezePoint = (value: Point2): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

/** Smallest signed angle from `from` to `to`, in (-pi, pi]. */
export const signedAngleDifference = (from: number, to: number) => {
  const raw = (to - from) % TAU
  const wrapped = raw > Math.PI ? raw - TAU : raw <= -Math.PI ? raw + TAU : raw
  return Object.is(wrapped, -0) ? 0 : wrapped
}

export const measureRelation = (
  a: HeadState,
  b: HeadState,
  timeSeconds: number,
): RelationMeasurement => {
  const dx = b.position.x - a.position.x
  const dy = b.position.y - a.position.y
  const distance = Math.hypot(dx, dy)
  const relativeVx = b.velocity.x - a.velocity.x
  const relativeVy = b.velocity.y - a.velocity.y

  // d/dt |B - A| projected onto the separation unit vector. Negative closes.
  const approachRate =
    distance <= epsilon
      ? 0
      : (dx * relativeVx + dy * relativeVy) / distance
  // Signed angular velocity of B about A.
  const rotationRate =
    distance <= epsilon
      ? 0
      : (dx * relativeVy - dy * relativeVx) / (distance * distance)
  const directionA = Math.atan2(a.velocity.y, a.velocity.x)
  const directionB = Math.atan2(b.velocity.y, b.velocity.x)

  return Object.freeze({
    timeSeconds,
    headAId: a.headId,
    headBId: b.headId,
    distance,
    angle: Math.atan2(dy, dx),
    approachRate,
    rotationRate,
    radiusDifference: Math.abs(a.radius - b.radius),
    angularDifference: Math.abs(signedAngleDifference(a.angle, b.angle)),
    speedDifference: Math.abs(a.speed - b.speed),
    directionDifference: Math.abs(
      signedAngleDifference(directionA, directionB),
    ),
  })
}

/**
 * The quantity each detector drives to zero. Conjunction and radial alignment
 * measure a separation; the angular detectors measure how far the pair is from
 * their target angle. Closest approach has no threshold and is handled apart.
 */
export const relationSeparation = (
  kind: RelationKind,
  measurement: RelationMeasurement,
): number => {
  if (kind === 'conjunction') return measurement.distance
  if (kind === 'radial-alignment') return measurement.radiusDifference
  if (kind === 'angular-alignment') return measurement.angularDifference
  if (kind === 'opposition') {
    return Math.abs(Math.PI - measurement.angularDifference)
  }
  if (kind === 'direction-match') return measurement.directionDifference
  return measurement.distance
}

const relationId = (
  relation: RelationSpec,
  headAId: string,
  headBId: string,
  timeSeconds: number,
) =>
  [relation.kind, relation.id, headAId, headBId, timeSeconds.toFixed(9)]
    .map(encodeURIComponent)
    .join('/')

export const compareRelationEncounters = (
  left: RelationEncounter,
  right: RelationEncounter,
) =>
  left.timeSeconds - right.timeSeconds ||
  compareText(left.relationId, right.relationId) ||
  compareText(left.subjectIds[0], right.subjectIds[0]) ||
  compareText(left.subjectIds[1], right.subjectIds[1]) ||
  compareText(left.id, right.id)

type PairState = {
  headAId: string
  headBId: string
  wheelAId: string
  wheelBId: string
}

/** Every unordered Head pair, canonically ordered and free of self-pairs. */
export const relationPairs = (
  composition: Composition,
  relation: RelationSpec,
): { pairs: ReadonlyArray<PairState>; diagnostics: Array<RelationDiagnostic> } => {
  const diagnostics: Array<RelationDiagnostic> = []
  const available = composition.wheels
    .filter((wheel) => wheel.enabled)
    .flatMap((wheel) =>
      wheel.heads
        .filter((head) => head.enabled)
        .map((head) => ({ wheelId: wheel.id, headId: head.id })),
    )
  const allowed = new Set(relation.headIds)

  for (const headId of relation.headIds) {
    if (!available.some((entry) => entry.headId === headId)) {
      diagnostics.push(
        Object.freeze({
          code: 'unknown-head' as const,
          relationId: relation.id,
          message: `Relation "${relation.name}" lists Head "${headId}", which is not an enabled Head.`,
        }),
      )
    }
  }

  const selected =
    allowed.size === 0
      ? available
      : available.filter((entry) => allowed.has(entry.headId))
  const sorted = [...selected].sort((left, right) =>
    compareText(left.headId, right.headId),
  )
  const pairs: Array<PairState> = []

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      // i < j over an id-sorted list forbids self-pairs and fixes A/B order.
      pairs.push({
        headAId: sorted[i].headId,
        headBId: sorted[j].headId,
        wheelAId: sorted[i].wheelId,
        wheelBId: sorted[j].wheelId,
      })
    }
  }

  if (pairs.length === 0) {
    diagnostics.push(
      Object.freeze({
        code: 'insufficient-pairs' as const,
        relationId: relation.id,
        message: `Relation "${relation.name}" needs at least two enabled Heads; it produced no pairs.`,
      }),
    )
  }

  return { pairs, diagnostics }
}

const midpoint = (a: HeadState, b: HeadState): Point2 => ({
  x: (a.position.x + b.position.x) / 2,
  y: (a.position.y + b.position.y) / 2,
})

/**
 * Strength is 1 at perfect coincidence and falls to 0 at the threshold, so a
 * Part's minStrength filter reads the same way it does for Boundary crossings.
 */
const relationStrength = (separation: number, threshold: number) => {
  if (threshold <= epsilon) return separation <= epsilon ? 1 : 0
  return Math.min(1, Math.max(0, 1 - separation / threshold))
}

export const compileRelationEncounters = (
  composition: Composition,
  request: PerformanceRequest,
  options: RelationScanOptions = {},
): RelationScanResult => {
  const maxEncounters = options.maxEncounters ?? relationScanDefaults.maxEncounters
  if (!Number.isInteger(maxEncounters) || maxEncounters < 1) {
    throw new RangeError('maxEncounters must be a positive integer.')
  }

  const relations = (composition.relations ?? [])
    .filter((relation) => relation.enabled)
    .sort((left, right) => compareText(left.id, right.id))
  if (relations.length === 0) {
    return Object.freeze({
      encounters: Object.freeze([]),
      diagnostics: Object.freeze([]),
    })
  }

  const sampleTimes = [...iterateTimeGrid(request)]
  const encounters: Array<RelationEncounter> = []
  const diagnostics: Array<RelationDiagnostic> = []
  const stateCache = new Map<string, HeadState>()
  const stateAt = (headId: string, timeSeconds: number) => {
    const key = `${headId}@${timeSeconds}`
    const cached = stateCache.get(key)
    if (cached) return cached
    const state = headStateAt(composition, headId, timeSeconds)
    stateCache.set(key, state)
    return state
  }
  let truncated = false

  scanRelations: for (const relation of relations) {
    const { pairs, diagnostics: pairDiagnostics } = relationPairs(
      composition,
      relation,
    )
    diagnostics.push(...pairDiagnostics)

    for (const pair of pairs) {
      const samples = sampleTimes.map((timeSeconds) => {
        const a = stateAt(pair.headAId, timeSeconds)
        const b = stateAt(pair.headBId, timeSeconds)
        const measurement = measureRelation(a, b, timeSeconds)
        return {
          timeSeconds,
          a,
          b,
          measurement,
          separation: relationSeparation(relation.kind, measurement),
        }
      })

      const emit = (index: number) => {
        const sample = samples[index]
        const address = transportAddressAtSeconds(
          composition.transport,
          sample.timeSeconds,
        )
        encounters.push(
          Object.freeze({
            id: relationId(
              relation,
              pair.headAId,
              pair.headBId,
              sample.timeSeconds,
            ),
            kind: relation.kind,
            relationId: relation.id,
            timeSeconds: sample.timeSeconds,
            subjectIds: Object.freeze([pair.headAId, pair.headBId] as const),
            wheelId: pair.wheelAId,
            headId: pair.headAId,
            partnerWheelId: pair.wheelBId,
            partnerHeadId: pair.headBId,
            position: freezePoint(midpoint(sample.a, sample.b)),
            direction:
              sample.measurement.approachRate <= 0 ? 'approaching' : 'receding',
            strength:
              relation.kind === 'closest-approach'
                ? 1
                : relationStrength(sample.separation, relation.threshold),
            speed: Math.hypot(
              sample.b.velocity.x - sample.a.velocity.x,
              sample.b.velocity.y - sample.a.velocity.y,
            ),
            measurement: sample.measurement,
            wheelPhase: sample.a.wheelPhase,
            absoluteBeat: address.absoluteBeat,
            barIndex: address.barIndex,
            beatInBar: address.beatInBar,
            barPhase: address.barPhase,
          }),
        )
      }

      let lastFiredSeconds = Number.NEGATIVE_INFINITY
      const debounced = (timeSeconds: number) =>
        timeSeconds - lastFiredSeconds < relation.minSeparationSeconds

      if (relation.kind === 'closest-approach') {
        // A local minimum must be genuinely lower than both neighbours, not
        // merely lower by floating-point noise. A rigidly rotating pair has a
        // constant separation, and without a prominence floor its rounding
        // jitter would fire on almost every sample.
        for (let index = 1; index < samples.length - 1; index += 1) {
          const previous = samples[index - 1].separation
          const current = samples[index].separation
          const next = samples[index + 1].separation
          const prominence = Math.max(1e-9, Math.abs(current) * 1e-7)

          if (
            previous - current > prominence &&
            next - current > prominence &&
            !debounced(samples[index].timeSeconds)
          ) {
            lastFiredSeconds = samples[index].timeSeconds
            emit(index)
            if (encounters.length > maxEncounters) {
              truncated = true
              break scanRelations
            }
          }
        }
        continue
      }

      // Threshold detectors latch on entry and only re-arm once the pair has
      // separated past threshold + hysteresis, so hovering cannot chatter.
      const release = relation.threshold + Math.max(0, relation.hysteresis)
      let engaged = samples.length > 0 && samples[0].separation <= relation.threshold

      if (engaged && !debounced(samples[0].timeSeconds)) {
        lastFiredSeconds = samples[0].timeSeconds
        emit(0)
        if (encounters.length > maxEncounters) {
          truncated = true
          break scanRelations
        }
      }

      for (let index = 1; index < samples.length; index += 1) {
        const separation = samples[index].separation

        if (!engaged && separation <= relation.threshold) {
          engaged = true
          if (debounced(samples[index].timeSeconds)) continue
          lastFiredSeconds = samples[index].timeSeconds
          emit(index)
          if (encounters.length > maxEncounters) {
            truncated = true
            break scanRelations
          }
        } else if (engaged && separation > release) {
          engaged = false
        }
      }
    }
  }

  const sorted = [...encounters]
    .sort(compareRelationEncounters)
    .slice(0, maxEncounters)

  if (truncated) {
    diagnostics.push(
      Object.freeze({
        code: 'maximum-relation-count' as const,
        relationId: '',
        message: `Relation compilation stopped at the configured maximum of ${maxEncounters}.`,
      }),
    )
  }

  return Object.freeze({
    encounters: Object.freeze(sorted),
    diagnostics: Object.freeze(diagnostics),
  })
}

export type ControlLanePoint = Readonly<{
  timeSeconds: number
  value: number
}>

export type ControlLane = Readonly<{
  partId: string
  name: string
  source: 'distance' | 'angle' | 'approach-rate' | 'rotation-rate' | 'strength'
  min: number
  max: number
  sampleRateHz: number
  points: ReadonlyArray<ControlLanePoint>
}>

const controlSourceValue = (
  source: ControlLane['source'],
  measurement: RelationMeasurement,
  threshold: number,
) => {
  if (source === 'distance') return measurement.distance
  if (source === 'angle') return measurement.angle
  if (source === 'approach-rate') return measurement.approachRate
  if (source === 'rotation-rate') return measurement.rotationRate
  return relationStrength(measurement.distance, threshold)
}

/**
 * Samples one continuous relationship on its own declared grid, independent of
 * the Encounter grid, then applies a one-pole smoother and clamps to the
 * Part's range. Sampling is derived from absolute time only, so a lane is
 * reproducible and seekable.
 */
export const compileControlLane = (
  composition: Composition,
  request: PerformanceRequest,
  part: {
    id: string
    control: {
      name: string
      source: ControlLane['source']
      min: number
      max: number
      sampleRateHz: number
      smoothingSeconds: number
    }
  },
  pair: { headAId: string; headBId: string },
  threshold = 1,
): ControlLane => {
  const { control } = part
  const step = 1 / control.sampleRateHz
  const end = request.startSeconds + request.durationSeconds
  const points: Array<ControlLanePoint> = []
  const low = Math.min(control.min, control.max)
  const high = Math.max(control.min, control.max)
  // One-pole coefficient from the declared time constant; 0 disables smoothing.
  const alpha =
    control.smoothingSeconds <= 0
      ? 1
      : 1 - Math.exp(-step / control.smoothingSeconds)
  let smoothed: number | null = null

  const count = Math.floor((end - request.startSeconds) / step + 1e-9)
  for (let index = 0; index <= count; index += 1) {
    const timeSeconds = request.startSeconds + index * step
    const a = headStateAt(composition, pair.headAId, timeSeconds)
    const b = headStateAt(composition, pair.headBId, timeSeconds)
    const measurement = measureRelation(a, b, timeSeconds)
    const raw = controlSourceValue(control.source, measurement, threshold)
    smoothed = smoothed === null ? raw : smoothed + alpha * (raw - smoothed)
    points.push(
      Object.freeze({
        timeSeconds,
        value: Math.min(high, Math.max(low, smoothed)),
      }),
    )
  }

  return Object.freeze({
    partId: part.id,
    name: control.name,
    source: control.source,
    min: low,
    max: high,
    sampleRateHz: control.sampleRateHz,
    points: Object.freeze(points),
  })
}
