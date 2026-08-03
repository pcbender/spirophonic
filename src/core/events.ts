import type { SpiroPoint } from './trochoid'

export type CurveEventSource =
  | 'zero-x'
  | 'zero-y'
  | 'curvature'
  | 'radius-max'
  | 'radius-min'

export type CrossingDirection = 'rising' | 'falling' | 'both'

export type CurveEvent = {
  t: number
  strength: number
  source: CurveEventSource
  index: number
}

export type ExtractOptions = {
  source: CurveEventSource
  direction?: CrossingDirection
  threshold?: number
  minSeparation?: number
  maxEvents?: number
}

export const defaultExtractOptions = {
  direction: 'rising' as CrossingDirection,
  threshold: 0.15,
  minSeparation: 0.01,
  maxEvents: 128,
}

export const extractEvents = (
  points: Array<SpiroPoint>,
  options: ExtractOptions,
): Array<CurveEvent> => {
  const {
    source,
    direction = defaultExtractOptions.direction,
    threshold = defaultExtractOptions.threshold,
    minSeparation = defaultExtractOptions.minSeparation,
    maxEvents = defaultExtractOptions.maxEvents,
  } = options

  if (points.length < 3) {
    return []
  }

  const candidates =
    source === 'zero-x' || source === 'zero-y'
      ? findCrossings(points, source === 'zero-x' ? 'x' : 'y', source, direction)
      : findPeaks(points, source, threshold)

  return suppress(candidates, minSeparation, maxEvents)
}

/**
 * Curves close by construction, so the final sample repeats the first. Every
 * helper below works over the unique samples and wraps its neighbor lookups,
 * which keeps a cusp or petal tip sitting exactly on the seam from being lost.
 */
const uniqueCount = (points: Array<SpiroPoint>) => points.length - 1

const findCrossings = (
  points: Array<SpiroPoint>,
  axis: 'x' | 'y',
  source: CurveEventSource,
  direction: CrossingDirection,
): Array<CurveEvent> => {
  const speeds = normalize(circularSpeeds(points))
  const count = uniqueCount(points)
  const events: Array<CurveEvent> = []

  for (let index = 0; index < count; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    const start = from[axis]
    const end = to[axis]
    const rising = start <= 0 && end > 0
    const falling = start >= 0 && end < 0
    const matched =
      direction === 'both' ? rising || falling : direction === 'rising' ? rising : falling

    if (!matched) {
      continue
    }

    const span = end - start
    const fraction = span === 0 ? 0 : -start / span
    const nearest = fraction < 0.5 ? index : (index + 1) % count

    events.push({
      t: wrapCycle(from.t + fraction * (to.t - from.t)),
      strength: speeds[nearest],
      source,
      index: nearest,
    })
  }

  return events
}

const findPeaks = (
  points: Array<SpiroPoint>,
  source: CurveEventSource,
  threshold: number,
): Array<CurveEvent> => {
  const raw =
    source === 'curvature'
      ? circularCurvatures(points)
      : points.slice(0, uniqueCount(points)).map((point) => point.radius)
  const normalized = normalize(raw)
  // A trough is as musically meaningful as a peak, so minima are searched by
  // inverting the field rather than by a second, near-identical scan.
  const field = source === 'radius-min' ? normalized.map((value) => 1 - value) : normalized
  const count = field.length
  const events: Array<CurveEvent> = []

  for (let index = 0; index < count; index += 1) {
    const previous = field[(index - 1 + count) % count]
    const next = field[(index + 1) % count]
    const value = field[index]

    // Trailing edge of a plateau wins, so a flat maximum yields one event.
    if (value >= previous && value > next && value >= threshold) {
      events.push({
        t: points[index].t,
        strength: value,
        source,
        index,
      })
    }
  }

  return events
}

/**
 * Keeps the strongest events and drops anything crowding them, measuring the
 * gap around the cycle so an event just after the seam suppresses one just
 * before it.
 */
const suppress = (
  candidates: Array<CurveEvent>,
  minSeparation: number,
  maxEvents: number,
): Array<CurveEvent> => {
  const ranked = [...candidates].sort(
    (left, right) => right.strength - left.strength || left.t - right.t,
  )
  const accepted: Array<CurveEvent> = []

  for (const candidate of ranked) {
    if (accepted.length >= maxEvents) {
      break
    }

    const crowded = accepted.some(
      (event) => cycleDistance(event.t, candidate.t) < minSeparation,
    )

    if (!crowded) {
      accepted.push(candidate)
    }
  }

  return accepted.sort((left, right) => left.t - right.t)
}

const circularSpeeds = (points: Array<SpiroPoint>) => {
  const count = uniqueCount(points)

  return Array.from({ length: count }, (_, index) => {
    const previous = points[(index - 1 + count) % count]
    const next = points[(index + 1) % count]

    return Math.hypot(next.x - previous.x, next.y - previous.y)
  })
}

/**
 * The turn angle at each sample, matching pointToHue's curvature definition in
 * mapping.ts but closed across the seam instead of zeroed at both ends.
 */
const circularCurvatures = (points: Array<SpiroPoint>) => {
  const count = uniqueCount(points)

  return Array.from({ length: count }, (_, index) => {
    const previous = points[(index - 1 + count) % count]
    const current = points[index]
    const next = points[(index + 1) % count]
    const incoming = Math.atan2(current.y - previous.y, current.x - previous.x)
    const outgoing = Math.atan2(next.y - current.y, next.x - current.x)

    return Math.abs(signedAngle(outgoing - incoming))
  })
}

/**
 * Min-max normalization with a relative guard, so a numerically constant field
 * such as the radius of a circle collapses to the middle instead of amplifying
 * float noise into a full-strength swing.
 */
export const normalize = (values: Array<number>) => {
  const low = values.reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY)
  const high = values.reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY)
  const span = high - low

  if (span <= Math.max(Math.abs(low), Math.abs(high), 1) * 1e-9) {
    return values.map(() => 0.5)
  }

  return values.map((value) => (value - low) / span)
}

export const wrapCycle = (t: number) => ((t % 1) + 1) % 1

export const cycleDistance = (left: number, right: number) => {
  const gap = Math.abs(wrapCycle(left) - wrapCycle(right))

  return Math.min(gap, 1 - gap)
}

/**
 * Folds an angle into -pi..pi, matching normalizeSignedAngle in mapping.ts.
 * The extra `+ tau` pass is required because JavaScript's remainder keeps the
 * sign of the dividend.
 */
const signedAngle = (angle: number) => {
  const tau = Math.PI * 2

  return ((((angle + Math.PI) % tau) + tau) % tau) - Math.PI
}
