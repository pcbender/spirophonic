import type { Point2 } from './composition'
import {
  boundarySignedDistance,
  spokeRayCoordinate,
  type BoundaryGeometry,
} from './fields'

export type TimedPathPoint = Readonly<{
  timeSeconds: number
  position: Readonly<Point2>
}>

export type RefinedBoundaryCrossing = Readonly<{
  fieldId: string
  boundaryId: string
  kind: BoundaryGeometry['kind']
  timeSeconds: number
  position: Readonly<Point2>
  intervalStartSeconds: number
  intervalEndSeconds: number
  fromDistance: number
  toDistance: number
  iterations: number
  converged: boolean
}>

export type CrossingScanDiagnostic = Readonly<{
  code: 'boundary-overlap' | 'refinement-limit'
  fieldId: string
  boundaryId: string
  intervalStartSeconds: number
  intervalEndSeconds: number
  message: string
}>

export type CrossingScanResult = Readonly<{
  crossings: ReadonlyArray<RefinedBoundaryCrossing>
  diagnostics: ReadonlyArray<CrossingScanDiagnostic>
}>

export type CrossingRefinementOptions = Readonly<{
  timeToleranceSeconds?: number
  spatialTolerance?: number
  maxIterations?: number
}>

/**
 * At or above the MG-06 convergence range, refinement targets 100 ns in time.
 * Encounter compilation separately recommends at least 64 samples per fastest
 * Wheel cycle so that intervals bracket individual crossings reliably.
 */
export const crossingRefinementDefaults = Object.freeze({
  timeToleranceSeconds: 1e-7,
  spatialTolerance: 1e-9,
  maxIterations: 40,
})

type RequiredCrossingOptions = Required<CrossingRefinementOptions>

type SampleWithDistance = TimedPathPoint &
  Readonly<{
    distance: number
  }>

const freezePoint = (value: Readonly<Point2>): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

const signWithTolerance = (value: number, tolerance: number) => {
  if (Math.abs(value) <= tolerance) return 0
  return value < 0 ? -1 : 1
}

const normalizeOptions = (
  options: CrossingRefinementOptions,
): RequiredCrossingOptions => {
  const timeToleranceSeconds =
    options.timeToleranceSeconds ??
    crossingRefinementDefaults.timeToleranceSeconds
  const spatialTolerance =
    options.spatialTolerance ?? crossingRefinementDefaults.spatialTolerance
  const maxIterations =
    options.maxIterations ?? crossingRefinementDefaults.maxIterations

  if (!Number.isFinite(timeToleranceSeconds) || timeToleranceSeconds <= 0) {
    throw new RangeError('timeToleranceSeconds must be finite and positive.')
  }
  if (!Number.isFinite(spatialTolerance) || spatialTolerance <= 0) {
    throw new RangeError('spatialTolerance must be finite and positive.')
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new RangeError('maxIterations must be a positive integer.')
  }

  return { timeToleranceSeconds, spatialTolerance, maxIterations }
}

const assertPathPoint = (point: TimedPathPoint, expectedTime: number) => {
  if (
    !Number.isFinite(point.timeSeconds) ||
    point.timeSeconds !== expectedTime ||
    !Number.isFinite(point.position.x) ||
    !Number.isFinite(point.position.y)
  ) {
    throw new RangeError(
      'A path evaluator must return the requested time and finite coordinates.',
    )
  }
}

const crossingLiesOnBoundary = (
  boundary: BoundaryGeometry,
  position: Readonly<Point2>,
  spatialTolerance: number,
) =>
  boundary.kind !== 'spoke' ||
  spokeRayCoordinate(boundary.center, boundary.angle, position) >=
    -spatialTolerance

const refinedResult = (
  boundary: BoundaryGeometry,
  point: TimedPathPoint,
  intervalStartSeconds: number,
  intervalEndSeconds: number,
  fromDistance: number,
  toDistance: number,
  iterations: number,
  converged: boolean,
): RefinedBoundaryCrossing =>
  Object.freeze({
    fieldId: boundary.fieldId,
    boundaryId: boundary.boundaryId,
    kind: boundary.kind,
    timeSeconds: point.timeSeconds,
    position: freezePoint(point.position),
    intervalStartSeconds,
    intervalEndSeconds,
    fromDistance,
    toDistance,
    iterations,
    converged,
  })

export const refineBoundaryCrossing = (
  boundary: BoundaryGeometry,
  from: TimedPathPoint,
  to: TimedPathPoint,
  pointAt: (timeSeconds: number) => TimedPathPoint,
  options: CrossingRefinementOptions = {},
): RefinedBoundaryCrossing => {
  const normalized = normalizeOptions(options)

  if (from.timeSeconds >= to.timeSeconds) {
    throw new RangeError('A crossing bracket must have increasing times.')
  }
  assertPathPoint(from, from.timeSeconds)
  assertPathPoint(to, to.timeSeconds)

  const intervalStartSeconds = from.timeSeconds
  const intervalEndSeconds = to.timeSeconds
  const fromDistance = boundarySignedDistance(boundary, from.position)
  const toDistance = boundarySignedDistance(boundary, to.position)
  let left = from
  let right = to
  let leftDistance = fromDistance
  const leftSign = signWithTolerance(
    leftDistance,
    normalized.spatialTolerance,
  )
  const rightSign = signWithTolerance(
    toDistance,
    normalized.spatialTolerance,
  )

  if (leftSign !== 0 && rightSign !== 0 && leftSign === rightSign) {
    throw new RangeError('A crossing bracket must contain a signed-distance root.')
  }
  if (leftSign === 0) {
    return refinedResult(
      boundary,
      left,
      intervalStartSeconds,
      intervalEndSeconds,
      fromDistance,
      toDistance,
      0,
      true,
    )
  }
  if (rightSign === 0) {
    return refinedResult(
      boundary,
      right,
      intervalStartSeconds,
      intervalEndSeconds,
      fromDistance,
      toDistance,
      0,
      true,
    )
  }

  for (let iteration = 1; iteration <= normalized.maxIterations; iteration += 1) {
    const middleTime = (left.timeSeconds + right.timeSeconds) / 2
    const middle = pointAt(middleTime)
    assertPathPoint(middle, middleTime)
    const middleDistance = boundarySignedDistance(boundary, middle.position)
    const middleSign = signWithTolerance(
      middleDistance,
      normalized.spatialTolerance,
    )
    const timeConverged =
      right.timeSeconds - left.timeSeconds <=
      normalized.timeToleranceSeconds

    if (middleSign === 0 || timeConverged) {
      return refinedResult(
        boundary,
        middle,
        intervalStartSeconds,
        intervalEndSeconds,
        fromDistance,
        toDistance,
        iteration,
        true,
      )
    }

    if (
      signWithTolerance(leftDistance, normalized.spatialTolerance) ===
      middleSign
    ) {
      left = middle
      leftDistance = middleDistance
    } else {
      right = middle
    }
  }

  const middleTime = (left.timeSeconds + right.timeSeconds) / 2
  const middle = pointAt(middleTime)
  assertPathPoint(middle, middleTime)

  return refinedResult(
    boundary,
    middle,
    intervalStartSeconds,
    intervalEndSeconds,
    fromDistance,
    toDistance,
    normalized.maxIterations,
    false,
  )
}

export const scanBoundaryCrossings = (
  boundary: BoundaryGeometry,
  sampleTimes: ReadonlyArray<number>,
  pointAt: (timeSeconds: number) => TimedPathPoint,
  options: CrossingRefinementOptions = {},
): CrossingScanResult => {
  const normalized = normalizeOptions(options)

  if (sampleTimes.length < 2) {
    throw new RangeError('A crossing scan requires at least two sample times.')
  }
  for (let index = 0; index < sampleTimes.length; index += 1) {
    if (!Number.isFinite(sampleTimes[index])) {
      throw new RangeError('Crossing sample times must be finite.')
    }
    if (index > 0 && sampleTimes[index] <= sampleTimes[index - 1]) {
      throw new RangeError('Crossing sample times must be strictly increasing.')
    }
  }

  const samples: Array<SampleWithDistance> = sampleTimes.map((timeSeconds) => {
    const point = pointAt(timeSeconds)
    assertPathPoint(point, timeSeconds)
    return Object.freeze({
      timeSeconds,
      position: freezePoint(point.position),
      distance: boundarySignedDistance(boundary, point.position),
    })
  })
  const crossings: Array<RefinedBoundaryCrossing> = []
  const diagnostics: Array<CrossingScanDiagnostic> = []

  for (let index = 0; index < samples.length - 1; index += 1) {
    const from = samples[index]
    const to = samples[index + 1]
    const fromSign = signWithTolerance(
      from.distance,
      normalized.spatialTolerance,
    )
    const toSign = signWithTolerance(to.distance, normalized.spatialTolerance)

    if (fromSign * toSign >= 0) continue

    const crossing = refineBoundaryCrossing(
      boundary,
      from,
      to,
      pointAt,
      normalized,
    )
    if (
      crossingLiesOnBoundary(
        boundary,
        crossing.position,
        normalized.spatialTolerance,
      )
    ) {
      crossings.push(crossing)
    }
    if (!crossing.converged) {
      diagnostics.push(
        Object.freeze({
          code: 'refinement-limit',
          fieldId: boundary.fieldId,
          boundaryId: boundary.boundaryId,
          intervalStartSeconds: from.timeSeconds,
          intervalEndSeconds: to.timeSeconds,
          message: `Crossing refinement reached ${normalized.maxIterations} iterations before the time tolerance.`,
        }),
      )
    }
  }

  let index = 0
  while (index < samples.length) {
    if (
      signWithTolerance(samples[index].distance, normalized.spatialTolerance) !==
      0
    ) {
      index += 1
      continue
    }

    const zeroStart = index
    while (
      index + 1 < samples.length &&
      signWithTolerance(
        samples[index + 1].distance,
        normalized.spatialTolerance,
      ) === 0
    ) {
      index += 1
    }
    const zeroEnd = index
    const previous = samples[zeroStart - 1]
    const next = samples[zeroEnd + 1]

    if (zeroEnd > zeroStart) {
      diagnostics.push(
        Object.freeze({
          code: 'boundary-overlap',
          fieldId: boundary.fieldId,
          boundaryId: boundary.boundaryId,
          intervalStartSeconds: samples[zeroStart].timeSeconds,
          intervalEndSeconds: samples[zeroEnd].timeSeconds,
          message:
            'The sampled path overlaps the Boundary; no discrete crossing was emitted.',
        }),
      )
    } else {
      const previousSign = previous
        ? signWithTolerance(previous.distance, normalized.spatialTolerance)
        : 0
      const nextSign = next
        ? signWithTolerance(next.distance, normalized.spatialTolerance)
        : 0
      const crossesAtWindowEdge = !previous || !next
      const passesThrough = previousSign * nextSign < 0
      const sample = samples[zeroStart]

      if (
        (crossesAtWindowEdge || passesThrough) &&
        crossingLiesOnBoundary(
          boundary,
          sample.position,
          normalized.spatialTolerance,
        )
      ) {
        crossings.push(
          refinedResult(
            boundary,
            sample,
            previous?.timeSeconds ?? sample.timeSeconds,
            next?.timeSeconds ?? sample.timeSeconds,
            previous?.distance ?? 0,
            next?.distance ?? 0,
            0,
            true,
          ),
        )
      }
    }

    index += 1
  }

  crossings.sort(
    (left, right) => left.timeSeconds - right.timeSeconds,
  )

  return Object.freeze({
    crossings: Object.freeze(crossings),
    diagnostics: Object.freeze(diagnostics),
  })
}
