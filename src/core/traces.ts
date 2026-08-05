import type {
  Composition,
  HeadSpec,
  Point2,
  TraceObservationSpec,
} from './composition'
import { headStateAt } from './heads'

export const traceObservationDefaults: TraceObservationSpec = Object.freeze({
  enabled: false,
  retention: 'window',
  sampleRateHz: 60,
  maxSegments: 4_000,
  allowSelf: false,
})

export const traceObservationOf = (head: HeadSpec): TraceObservationSpec =>
  head.observation ?? traceObservationDefaults

/** One sampled step of a Head's path, carrying the times of both endpoints. */
export type TraceSegment = Readonly<{
  wheelId: string
  headId: string
  index: number
  fromSeconds: number
  toSeconds: number
  from: Readonly<Point2>
  to: Readonly<Point2>
}>

export type RetainedTrace = Readonly<{
  wheelId: string
  headId: string
  observation: TraceObservationSpec
  startSeconds: number
  endSeconds: number
  segments: ReadonlyArray<TraceSegment>
  truncated: boolean
}>

export type TraceDiagnostic = Readonly<{
  code: 'segment-limit' | 'unknown-head'
  headId: string
  message: string
}>

const freezePoint = (value: Point2): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

/**
 * Samples the path a Head has already travelled, from the retention floor up to
 * `throughSeconds`. Sampling is derived from absolute time only, so the same
 * request reproduces the same segments regardless of how playback reached it.
 */
export const buildRetainedTrace = (
  composition: Composition,
  wheelId: string,
  head: HeadSpec,
  windowStartSeconds: number,
  throughSeconds: number,
): { trace: RetainedTrace; diagnostics: ReadonlyArray<TraceDiagnostic> } => {
  const observation = traceObservationOf(head)
  const diagnostics: Array<TraceDiagnostic> = []

  if (!Number.isFinite(throughSeconds) || throughSeconds < windowStartSeconds) {
    throw new RangeError('throughSeconds must be at or after the window start.')
  }
  if (
    !Number.isFinite(observation.sampleRateHz) ||
    observation.sampleRateHz <= 0
  ) {
    throw new RangeError('Trace sampleRateHz must be finite and positive.')
  }

  const retentionFloor =
    observation.retention === 'full'
      ? windowStartSeconds
      : Math.max(
          windowStartSeconds,
          throughSeconds - head.trace.historySeconds,
        )
  const step = 1 / observation.sampleRateHz
  const segments: Array<TraceSegment> = []
  let truncated = false

  // Walk the grid anchored at the window start so segment boundaries are
  // identical no matter which observation time asked for them.
  const firstIndex = Math.ceil((retentionFloor - windowStartSeconds) / step - 1e-9)
  const lastIndex = Math.floor((throughSeconds - windowStartSeconds) / step + 1e-9)

  for (let index = firstIndex; index < lastIndex; index += 1) {
    const fromSeconds = windowStartSeconds + index * step
    const toSeconds = windowStartSeconds + (index + 1) * step
    if (toSeconds > throughSeconds + 1e-12) break

    if (segments.length >= observation.maxSegments) {
      truncated = true
      diagnostics.push(
        Object.freeze({
          code: 'segment-limit' as const,
          headId: head.id,
          message: `Trace for Head "${head.name}" reached its ${observation.maxSegments}-segment limit; older path was dropped.`,
        }),
      )
      break
    }

    segments.push(
      Object.freeze({
        wheelId,
        headId: head.id,
        index,
        fromSeconds,
        toSeconds,
        from: freezePoint(headStateAt(composition, head.id, fromSeconds).position),
        to: freezePoint(headStateAt(composition, head.id, toSeconds).position),
      }),
    )
  }

  return {
    trace: Object.freeze({
      wheelId,
      headId: head.id,
      observation,
      startSeconds: retentionFloor,
      endSeconds: throughSeconds,
      segments: Object.freeze(segments),
      truncated,
    }),
    diagnostics: Object.freeze(diagnostics),
  }
}

/**
 * Uniform-grid index over Trace segments. Crossing tests query only the cells a
 * probe segment touches, so cost scales with local density rather than as an
 * all-pairs scan over every retained segment.
 */
export class TraceSegmentIndex {
  private readonly cellSize: number
  private readonly cells = new Map<string, Array<TraceSegment>>()
  private count = 0

  constructor(segments: ReadonlyArray<TraceSegment>, cellSize?: number) {
    const resolved = cellSize ?? TraceSegmentIndex.suggestCellSize(segments)
    this.cellSize = resolved > 0 ? resolved : 1
    for (const segment of segments) this.insert(segment)
  }

  get size() {
    return this.count
  }

  /** A cell about as wide as a typical segment keeps buckets small. */
  static suggestCellSize(segments: ReadonlyArray<TraceSegment>) {
    if (segments.length === 0) return 1
    let total = 0
    for (const segment of segments) {
      total += Math.hypot(
        segment.to.x - segment.from.x,
        segment.to.y - segment.from.y,
      )
    }
    return Math.max(1, (total / segments.length) * 4)
  }

  private key(cellX: number, cellY: number) {
    return `${cellX}:${cellY}`
  }

  private *cellsFor(from: Readonly<Point2>, to: Readonly<Point2>) {
    const minX = Math.floor(Math.min(from.x, to.x) / this.cellSize)
    const maxX = Math.floor(Math.max(from.x, to.x) / this.cellSize)
    const minY = Math.floor(Math.min(from.y, to.y) / this.cellSize)
    const maxY = Math.floor(Math.max(from.y, to.y) / this.cellSize)

    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        yield this.key(cellX, cellY)
      }
    }
  }

  private insert(segment: TraceSegment) {
    this.count += 1
    for (const key of this.cellsFor(segment.from, segment.to)) {
      const bucket = this.cells.get(key)
      if (bucket) bucket.push(segment)
      else this.cells.set(key, [segment])
    }
  }

  /** Candidate segments whose cells overlap the probe, in stable order. */
  query(
    from: Readonly<Point2>,
    to: Readonly<Point2>,
  ): ReadonlyArray<TraceSegment> {
    const seen = new Set<TraceSegment>()
    const found: Array<TraceSegment> = []

    for (const key of this.cellsFor(from, to)) {
      const bucket = this.cells.get(key)
      if (!bucket) continue
      for (const segment of bucket) {
        if (seen.has(segment)) continue
        seen.add(segment)
        found.push(segment)
      }
    }

    // Stable order so downstream results never depend on cell iteration.
    return found.sort(
      (left, right) =>
        left.fromSeconds - right.fromSeconds ||
        (left.headId < right.headId ? -1 : left.headId > right.headId ? 1 : 0) ||
        left.index - right.index,
    )
  }
}
