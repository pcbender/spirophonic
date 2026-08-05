import type { Composition, Point2 } from './composition'
import { headStateAt } from './heads'
import {
  buildRetainedTrace,
  traceObservationOf,
  TraceSegmentIndex,
  type TraceDiagnostic,
} from './traces'
import {
  iterateTimeGrid,
  transportAddressAtSeconds,
  type PerformanceRequest,
} from './transport'

const epsilon = 1e-12

export type TraceCrossingDirection = 'clockwise' | 'counterclockwise'

export type TraceCrossingEncounter = Readonly<{
  id: string
  kind: 'trace-crossing'
  timeSeconds: number
  subjectIds: readonly [string, string]
  /** The Head doing the crossing. */
  wheelId: string
  headId: string
  /** The Head whose retained path was crossed. */
  targetWheelId: string
  targetHeadId: string
  targetSegmentIndex: number
  position: Readonly<Point2>
  /** How old the crossed path was, in seconds, at the moment of crossing. */
  ageSeconds: number
  direction: TraceCrossingDirection
  strength: number
  speed: number
  incidenceAngle: number
  selfCrossing: boolean
  wheelPhase: number
  absoluteBeat: number
  barIndex: number
  beatInBar: number
  barPhase: number
}>

export type TraceEncounterDiagnostic =
  | TraceDiagnostic
  | Readonly<{
      code: 'maximum-trace-encounters' | 'observation-budget'
      headId: string
      message: string
    }>

export type TraceEncounterResult = Readonly<{
  encounters: ReadonlyArray<TraceCrossingEncounter>
  diagnostics: ReadonlyArray<TraceEncounterDiagnostic>
}>

export type TraceEncounterOptions = Readonly<{
  maxEncounters?: number
  /** Total retained segments allowed across all Heads before diagnosing. */
  maxTotalSegments?: number
}>

export const traceEncounterDefaults = Object.freeze({
  maxEncounters: 10_000,
  maxTotalSegments: 200_000,
})

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

const freezePoint = (value: Point2): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

export type SegmentIntersection = Readonly<{
  position: Readonly<Point2>
  /** Parameter along the probe segment, in [0, 1]. */
  probeT: number
  /** Parameter along the target segment, in [0, 1]. */
  targetT: number
  cross: number
}>

/**
 * Proper segment intersection. Returns null for parallel or collinear pairs,
 * which is the tangency and retracing policy: a probe that runs along a Trace
 * rather than through it produces no discrete crossing, because there is no
 * single well-defined point or moment to report.
 */
export const segmentIntersection = (
  probeFrom: Readonly<Point2>,
  probeTo: Readonly<Point2>,
  targetFrom: Readonly<Point2>,
  targetTo: Readonly<Point2>,
  tolerance = 1e-9,
): SegmentIntersection | null => {
  const probeDx = probeTo.x - probeFrom.x
  const probeDy = probeTo.y - probeFrom.y
  const targetDx = targetTo.x - targetFrom.x
  const targetDy = targetTo.y - targetFrom.y
  const denominator = probeDx * targetDy - probeDy * targetDx

  // Parallel, collinear, or a degenerate zero-length segment.
  if (Math.abs(denominator) <= tolerance) return null

  const originDx = targetFrom.x - probeFrom.x
  const originDy = targetFrom.y - probeFrom.y
  const probeT = (originDx * targetDy - originDy * targetDx) / denominator
  const targetT = (originDx * probeDy - originDy * probeDx) / denominator

  if (probeT < -tolerance || probeT > 1 + tolerance) return null
  if (targetT < -tolerance || targetT > 1 + tolerance) return null

  return Object.freeze({
    position: freezePoint({
      x: probeFrom.x + probeDx * probeT,
      y: probeFrom.y + probeDy * probeT,
    }),
    probeT: Math.min(1, Math.max(0, probeT)),
    targetT: Math.min(1, Math.max(0, targetT)),
    cross: denominator,
  })
}

const encounterId = (
  headId: string,
  targetHeadId: string,
  targetIndex: number,
  timeSeconds: number,
) =>
  [
    'trace-crossing',
    headId,
    targetHeadId,
    String(targetIndex),
    timeSeconds.toFixed(9),
  ]
    .map(encodeURIComponent)
    .join('/')

export const compareTraceEncounters = (
  left: TraceCrossingEncounter,
  right: TraceCrossingEncounter,
) =>
  left.timeSeconds - right.timeSeconds ||
  compareText(left.headId, right.headId) ||
  compareText(left.targetHeadId, right.targetHeadId) ||
  left.targetSegmentIndex - right.targetSegmentIndex ||
  compareText(left.id, right.id)

/**
 * Compiles Head-versus-retained-Trace crossings.
 *
 * Causality is the load-bearing rule: a probe step spanning [t0, t1] may only
 * meet target segments that ended at or before t0. A Head can therefore never
 * encounter a path that has not been drawn yet, and self-crossings can never
 * match the segment the Head is currently drawing.
 */
export const compileTraceEncounters = (
  composition: Composition,
  request: PerformanceRequest,
  options: TraceEncounterOptions = {},
): TraceEncounterResult => {
  const maxEncounters =
    options.maxEncounters ?? traceEncounterDefaults.maxEncounters
  const maxTotalSegments =
    options.maxTotalSegments ?? traceEncounterDefaults.maxTotalSegments
  const diagnostics: Array<TraceEncounterDiagnostic> = []

  const observed = composition.wheels
    .filter((wheel) => wheel.enabled)
    .flatMap((wheel) =>
      wheel.heads
        .filter((head) => head.enabled && traceObservationOf(head).enabled)
        .map((head) => ({ wheel, head })),
    )
    .sort(
      (left, right) =>
        compareText(left.wheel.id, right.wheel.id) ||
        compareText(left.head.id, right.head.id),
    )

  if (observed.length === 0) {
    return Object.freeze({
      encounters: Object.freeze([]),
      diagnostics: Object.freeze([]),
    })
  }

  const sampleTimes = [...iterateTimeGrid(request)]
  const windowStart = request.startSeconds
  const windowEnd = request.startSeconds + request.durationSeconds

  // Retained paths are built once for the whole window; causality is then
  // enforced per probe step rather than by rebuilding a trace at every time.
  let totalSegments = 0
  const retained = observed.map(({ wheel, head }) => {
    const { trace, diagnostics: traceDiagnostics } = buildRetainedTrace(
      composition,
      wheel.id,
      head,
      windowStart,
      windowEnd,
    )
    diagnostics.push(...traceDiagnostics)
    totalSegments += trace.segments.length
    return { wheel, head, trace, index: new TraceSegmentIndex(trace.segments) }
  })

  if (totalSegments > maxTotalSegments) {
    diagnostics.push(
      Object.freeze({
        code: 'observation-budget' as const,
        headId: '',
        message: `Trace observation retained ${totalSegments} segments, above the configured budget of ${maxTotalSegments}. Lower a Head's sample rate or shorten its history.`,
      }),
    )
  }

  const encounters: Array<TraceCrossingEncounter> = []
  let truncated = false

  scanProbes: for (const { wheel, head } of observed) {
    for (let step = 0; step < sampleTimes.length - 1; step += 1) {
      const fromSeconds = sampleTimes[step]
      const toSeconds = sampleTimes[step + 1]
      const fromState = headStateAt(composition, head.id, fromSeconds)
      const toState = headStateAt(composition, head.id, toSeconds)

      for (const target of retained) {
        const allowSelf = traceObservationOf(head).allowSelf
        const isSelf = target.head.id === head.id
        if (isSelf && !allowSelf) continue

        for (const segment of target.index.query(
          fromState.position,
          toState.position,
        )) {
          // Causality: the crossed path must already exist when the probe runs.
          if (segment.toSeconds > fromSeconds + 1e-12) continue
          // Retention: a segment older than the target's floor is not observable.
          if (segment.fromSeconds < target.trace.startSeconds - 1e-12) continue

          const hit = segmentIntersection(
            fromState.position,
            toState.position,
            segment.from,
            segment.to,
          )
          if (!hit) continue

          const timeSeconds =
            fromSeconds + (toSeconds - fromSeconds) * hit.probeT
          const state = headStateAt(composition, head.id, timeSeconds)
          const address = transportAddressAtSeconds(
            composition.transport,
            timeSeconds,
          )
          const targetDx = segment.to.x - segment.from.x
          const targetDy = segment.to.y - segment.from.y
          const targetLength = Math.hypot(targetDx, targetDy)
          const speed = state.speed
          // Incidence is measured against the crossed segment's own direction.
          const sine =
            speed <= epsilon || targetLength <= epsilon
              ? 0
              : Math.min(
                  1,
                  Math.abs(
                    (state.velocity.x * targetDy - state.velocity.y * targetDx) /
                      (speed * targetLength),
                  ),
                )

          encounters.push(
            Object.freeze({
              id: encounterId(
                head.id,
                segment.headId,
                segment.index,
                timeSeconds,
              ),
              kind: 'trace-crossing' as const,
              timeSeconds,
              subjectIds: Object.freeze([head.id, segment.headId] as const),
              wheelId: wheel.id,
              headId: head.id,
              targetWheelId: segment.wheelId,
              targetHeadId: segment.headId,
              targetSegmentIndex: segment.index,
              position: hit.position,
              ageSeconds: timeSeconds - segment.toSeconds,
              direction: hit.cross > 0 ? 'counterclockwise' : 'clockwise',
              strength: sine,
              speed,
              incidenceAngle: Math.acos(Math.min(1, Math.max(0, sine))),
              selfCrossing: isSelf,
              wheelPhase: state.wheelPhase,
              absoluteBeat: address.absoluteBeat,
              barIndex: address.barIndex,
              beatInBar: address.beatInBar,
              barPhase: address.barPhase,
            }),
          )

          if (encounters.length > maxEncounters) {
            truncated = true
            break scanProbes
          }
        }
      }
    }
  }

  const sorted = [...encounters]
    .sort(compareTraceEncounters)
    .slice(0, maxEncounters)

  if (truncated) {
    diagnostics.push(
      Object.freeze({
        code: 'maximum-trace-encounters' as const,
        headId: '',
        message: `Trace encounter compilation stopped at the configured maximum of ${maxEncounters}.`,
      }),
    )
  }

  return Object.freeze({
    encounters: Object.freeze(sorted),
    diagnostics: Object.freeze(diagnostics),
  })
}
