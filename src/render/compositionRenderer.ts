import type {
  Composition,
  Point2,
  SpaceSpec,
  TracePresentationSpec,
} from '../core/composition'
import type { GateModulationLane } from '../core/gateModulation'
import {
  activeBoundaryGeometries,
  type BoundaryGeometry,
} from '../core/fields'
import { headStateAt, type HeadState } from '../core/heads'
import { iterateTimeGrid } from '../core/transport'

export type ObservationInterval = {
  startSeconds: number
  endSeconds: number
  sampleRateHz: number
}

export type TraceMode = 'configured' | TracePresentationSpec['mode']

export type CompositionSceneOptions = {
  traceMode?: TraceMode
  modulationLanes?: ReadonlyArray<GateModulationLane>
}

export type TracePointSnapshot = {
  timeSeconds: number
  position: Readonly<Point2>
  wheelPhase: number
  headPhase: number
}

export type HeadSnapshot = Readonly<{
  wheelId: string
  headId: string
  subjectIds: readonly [string, string]
  timeSeconds: number
  wheelPhase: number
  headPhase: number
  position: Readonly<Point2>
  velocity: Readonly<Point2>
  speed: number
  angle: number
  radius: number
}>

export type HeadTraceSnapshot = Readonly<{
  wheelId: string
  headId: string
  style: Readonly<TracePresentationSpec>
  points: ReadonlyArray<Readonly<TracePointSnapshot>>
  head: HeadSnapshot
}>

export type CompositionScene = Readonly<{
  compositionId: string
  timeSeconds: number
  observation: Readonly<ObservationInterval>
  boundaries: ReadonlyArray<BoundaryGeometry>
  traces: ReadonlyArray<HeadTraceSnapshot>
  modulationLanes: ReadonlyArray<GateModulationLane>
}>

export type CanvasViewport = {
  width: number
  height: number
  padding?: number
}

export type SpaceProjection = Readonly<{
  width: number
  height: number
  padding: number
  center: Readonly<Point2>
  canvasCenter: Readonly<Point2>
  pixelsPerUnit: number
}>

export type CompositionDrawOptions = {
  background?: string
  fieldColor?: string
  fieldLineWidth?: number
  showFields?: boolean
  showBoundaryLabels?: boolean
  showTraces?: boolean
  showHeads?: boolean
  showDebugIds?: boolean
  headRadiusPixels?: number
}

export type ClearDrawCommand = Readonly<{
  kind: 'clear'
  width: number
  height: number
  color: string
}>

export type TraceDrawCommand = Readonly<{
  kind: 'trace'
  wheelId: string
  headId: string
  points: ReadonlyArray<Readonly<Point2>>
  color: string
  lineWidth: number
  opacity: number
  modulationLaneIds?: ReadonlyArray<string>
  modulationTargets?: ReadonlyArray<GateModulationLane['target']>
}>

export type RingBoundaryDrawCommand = Readonly<{
  kind: 'ring-boundary'
  fieldId: string
  boundaryId: string
  center: Readonly<Point2>
  radius: number
  color: string
  lineWidth: number
}>

export type SpokeBoundaryDrawCommand = Readonly<{
  kind: 'spoke-boundary'
  fieldId: string
  boundaryId: string
  from: Readonly<Point2>
  to: Readonly<Point2>
  color: string
  lineWidth: number
}>

export type WedgeBoundaryDrawCommand = Readonly<{
  kind: 'wedge-boundary'
  fieldId: string
  boundaryId: string
  center: Readonly<Point2>
  left: Readonly<Point2>
  right: Readonly<Point2>
  color: string
  lineWidth: number
  fillOpacity: number
}>

export type EllipseBoundaryDrawCommand = Readonly<{
  kind: 'ellipse-boundary'
  fieldId: string
  boundaryId: string
  center: Readonly<Point2>
  radiusX: number
  radiusY: number
  rotation: number
  color: string
  lineWidth: number
}>

/** Sampled path, used for families with no primitive canvas form. */
export type PolylineBoundaryDrawCommand = Readonly<{
  kind: 'polyline-boundary'
  fieldId: string
  boundaryId: string
  points: ReadonlyArray<Readonly<Point2>>
  color: string
  lineWidth: number
}>

export type BoundaryLabelDrawCommand = Readonly<{
  kind: 'boundary-label'
  fieldId: string
  boundaryId: string
  position: Readonly<Point2>
  text: string
  color: string
}>

export type HeadDrawCommand = Readonly<{
  kind: 'head'
  wheelId: string
  headId: string
  position: Readonly<Point2>
  color: string
  radius: number
  opacity: number
}>

export type LabelDrawCommand = Readonly<{
  kind: 'label'
  wheelId: string
  headId: string
  position: Readonly<Point2>
  text: string
  color: string
}>

export type CompositionDrawCommand =
  | ClearDrawCommand
  | RingBoundaryDrawCommand
  | SpokeBoundaryDrawCommand
  | WedgeBoundaryDrawCommand
  | EllipseBoundaryDrawCommand
  | PolylineBoundaryDrawCommand
  | BoundaryLabelDrawCommand
  | TraceDrawCommand
  | HeadDrawCommand
  | LabelDrawCommand

const freezePoint = (value: Point2): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

const freezeHeadState = (state: HeadState): HeadSnapshot =>
  Object.freeze({
    ...state,
    subjectIds: Object.freeze([...state.subjectIds]) as readonly [string, string],
    position: freezePoint(state.position),
    velocity: freezePoint(state.velocity),
  })

const validateObservation = (
  observation: ObservationInterval,
  timeSeconds: number,
) => {
  const values = [
    observation.startSeconds,
    observation.endSeconds,
    observation.sampleRateHz,
    timeSeconds,
  ]

  if (!values.every(Number.isFinite)) {
    throw new RangeError('Observation and render times must be finite numbers.')
  }
  if (observation.startSeconds < 0) {
    throw new RangeError('Observation startSeconds must be non-negative.')
  }
  if (observation.endSeconds < observation.startSeconds) {
    throw new RangeError('Observation endSeconds must not precede startSeconds.')
  }
  if (observation.sampleRateHz < 1 || observation.sampleRateHz > 1_000) {
    throw new RangeError('Observation sampleRateHz must be from 1 through 1000.')
  }
  if (
    timeSeconds < observation.startSeconds ||
    timeSeconds > observation.endSeconds
  ) {
    throw new RangeError('Render time must fall inside the observation interval.')
  }
}

const intervalTimes = (
  startSeconds: number,
  endSeconds: number,
  sampleRateHz: number,
) => {
  if (startSeconds === endSeconds) return [startSeconds]

  if (endSeconds - startSeconds < 0.001) {
    return [startSeconds, endSeconds]
  }

  return Array.from(
    iterateTimeGrid({
      startSeconds,
      durationSeconds: endSeconds - startSeconds,
      sampleRateHz,
    }),
  )
}

const snapshotTracePoint = (
  composition: Composition,
  headId: string,
  timeSeconds: number,
): Readonly<TracePointSnapshot> => {
  const state = headStateAt(composition, headId, timeSeconds)

  return Object.freeze({
    timeSeconds,
    position: freezePoint(state.position),
    wheelPhase: state.wheelPhase,
    headPhase: state.headPhase,
  })
}

/**
 * Samples immutable renderer input from absolute state. Configured Wheel and
 * Head order is preserved and no Canvas or animation-frame state is consulted.
 */
export const buildCompositionScene = (
  composition: Composition,
  timeSeconds: number,
  observation: ObservationInterval,
  options: CompositionSceneOptions = {},
): CompositionScene => {
  validateObservation(observation, timeSeconds)

  const traces: Array<HeadTraceSnapshot> = []

  for (const wheel of composition.wheels) {
    if (!wheel.enabled) continue

    for (const head of wheel.heads) {
      if (!head.enabled) continue

      const mode =
        options.traceMode === undefined || options.traceMode === 'configured'
          ? head.trace.mode
          : options.traceMode
      const startSeconds =
        mode === 'full'
          ? observation.startSeconds
          : Math.max(observation.startSeconds, timeSeconds - head.trace.historySeconds)
      const endSeconds = mode === 'full' ? observation.endSeconds : timeSeconds
      const points = intervalTimes(
        startSeconds,
        endSeconds,
        observation.sampleRateHz,
      ).map((sampleTime) =>
        snapshotTracePoint(composition, head.id, sampleTime),
      )
      const style = Object.freeze({ ...head.trace })

      traces.push(
        Object.freeze({
          wheelId: wheel.id,
          headId: head.id,
          style,
          points: Object.freeze(points),
          head: freezeHeadState(headStateAt(composition, head.id, timeSeconds)),
        }),
      )
    }
  }

  return Object.freeze({
    compositionId: composition.id,
    timeSeconds,
    observation: Object.freeze({ ...observation }),
    boundaries: activeBoundaryGeometries(composition),
    traces: Object.freeze(traces),
    modulationLanes: Object.freeze([...(options.modulationLanes ?? [])]),
  })
}

export const sceneSpacePoints = (
  scene: CompositionScene,
): ReadonlyArray<Readonly<Point2>> =>
  [
    ...scene.boundaries.flatMap((boundary) => {
      if (boundary.kind === 'ring') {
        return [
          { x: boundary.center.x - boundary.radius, y: boundary.center.y },
          { x: boundary.center.x + boundary.radius, y: boundary.center.y },
          { x: boundary.center.x, y: boundary.center.y - boundary.radius },
          { x: boundary.center.x, y: boundary.center.y + boundary.radius },
        ]
      }

      return [boundary.center]
    }),
    ...scene.traces.flatMap((trace) => [
      ...trace.points.map((item) => item.position),
      trace.head.position,
    ]),
  ]

/** Fits around Space.center, then applies Space.scale as a deterministic zoom. */
export const fitSpaceProjection = (
  space: SpaceSpec,
  points: ReadonlyArray<Readonly<Point2>>,
  viewport: CanvasViewport,
): SpaceProjection => {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError('Viewport dimensions must be finite and positive.')
  }
  if (!Number.isFinite(space.scale) || space.scale <= 0) {
    throw new RangeError('Space scale must be finite and positive.')
  }

  const maximumPadding = Math.max(0, Math.min(viewport.width, viewport.height) / 2 - 0.5)
  const padding = Math.min(
    maximumPadding,
    Math.max(0, Number.isFinite(viewport.padding) ? (viewport.padding ?? 0) : 0),
  )
  const extents = points.reduce(
    (current, item) => ({
      x: Math.max(current.x, Math.abs(item.x - space.center.x)),
      y: Math.max(current.y, Math.abs(item.y - space.center.y)),
    }),
    { x: 1, y: 1 },
  )
  const availableWidth = Math.max(1, viewport.width - 2 * padding)
  const availableHeight = Math.max(1, viewport.height - 2 * padding)
  const fitScale = Math.min(
    availableWidth / (2 * extents.x),
    availableHeight / (2 * extents.y),
  )

  return Object.freeze({
    width: viewport.width,
    height: viewport.height,
    padding,
    center: freezePoint(space.center),
    canvasCenter: freezePoint({
      x: viewport.width / 2,
      y: viewport.height / 2,
    }),
    pixelsPerUnit: fitScale * space.scale,
  })
}

export const projectSpacePoint = (
  value: Readonly<Point2>,
  projection: SpaceProjection,
): Readonly<Point2> =>
  freezePoint({
    x:
      (value.x - projection.center.x) * projection.pixelsPerUnit +
      projection.canvasCenter.x,
    y:
      (value.y - projection.center.y) * projection.pixelsPerUnit * -1 +
      projection.canvasCenter.y,
  })

const meanLaneValue = (
  lane: GateModulationLane,
  startSeconds: number,
  endSeconds: number,
) => {
  const samples = lane.samples.filter(
    (sample) =>
      sample.timeSeconds >= startSeconds - 1e-12 &&
      sample.timeSeconds <= endSeconds + 1e-12,
  )
  if (samples.length === 0) return 0.5
  return (
    samples.reduce((sum, sample) => sum + sample.normalizedValue, 0) /
    samples.length
  )
}

const mixHex = (from: string, to: string, amount: number) => {
  const parse = (value: string) => {
    const match = /^#([0-9a-f]{6})$/i.exec(value)
    if (!match) return null
    const packed = Number.parseInt(match[1], 16)
    return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255]
  }
  const left = parse(from)
  const right = parse(to)
  if (!left || !right) return from
  const ratio = Math.min(1, Math.max(0, amount))
  const channels = left.map((value, index) =>
    Math.round(value + (right[index] - value) * ratio),
  )
  return `#${channels
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

const modulatedTraceStyle = (
  style: Readonly<TracePresentationSpec>,
  lanes: ReadonlyArray<GateModulationLane>,
  startSeconds: number,
  endSeconds: number,
) => {
  let color = style.color
  let lineWidth = style.lineWidth
  let opacity = style.opacity

  for (const lane of [...lanes].sort((left, right) =>
    left.target.localeCompare(right.target),
  )) {
    const value = meanLaneValue(lane, startSeconds, endSeconds)
    if (lane.target === 'gain') {
      lineWidth *= 0.5 + value * 1.5
      opacity *= 0.4 + value * 0.6
    } else if (lane.target === 'brightness') {
      color = mixHex(color, '#ffffff', value * 0.7)
    } else if (lane.target === 'pan') {
      color = mixHex(color, '#b388ff', Math.abs(value - 0.5) * 1.2)
    } else if (lane.target === 'pitch-offset') {
      color = mixHex(color, '#f2c14e', value * 0.65)
    }
  }

  return {
    color,
    lineWidth: Math.max(0.5, lineWidth),
    opacity: Math.min(1, Math.max(0, opacity)),
  }
}

type ModulatedTraceInterval = Readonly<{
  startSeconds: number
  endSeconds: number
  lanes: ReadonlyArray<GateModulationLane>
  points: ReadonlyArray<Readonly<Point2>>
  sampleTimes: ReadonlyArray<number>
}>

const modulatedIntervalsFor = (
  scene: CompositionScene,
  trace: HeadTraceSnapshot,
  projection: SpaceProjection,
): ReadonlyArray<ModulatedTraceInterval> => {
  const firstTraceTime = trace.points[0]?.timeSeconds ?? scene.timeSeconds
  const lastTraceTime = trace.points.at(-1)?.timeSeconds ?? scene.timeSeconds
  const byNote = new Map<string, Array<GateModulationLane>>()
  for (const lane of scene.modulationLanes) {
    if (
      lane.headId !== trace.headId ||
      lane.entryOnly ||
      lane.endSeconds < firstTraceTime ||
      lane.startSeconds > lastTraceTime ||
      lane.startSeconds > scene.timeSeconds
    ) {
      continue
    }
    const group = byNote.get(lane.noteEventId) ?? []
    group.push(lane)
    byNote.set(lane.noteEventId, group)
  }

  return Object.freeze(
    [...byNote.values()]
      .map((lanes): ModulatedTraceInterval | null => {
        const anchor = [...lanes].sort(
          (left, right) =>
            right.samples.length - left.samples.length ||
            left.id.localeCompare(right.id),
        )[0]
        const startSeconds = Math.max(firstTraceTime, anchor.startSeconds)
        const endSeconds = Math.min(
          lastTraceTime,
          scene.timeSeconds,
          anchor.endSeconds,
        )
        const samples = anchor.samples.filter(
          (sample) =>
            sample.timeSeconds >= startSeconds - 1e-12 &&
            sample.timeSeconds <= endSeconds + 1e-12,
        )
        if (samples.length < 2) return null
        return Object.freeze({
          startSeconds,
          endSeconds,
          lanes: Object.freeze([...lanes].sort((left, right) =>
            left.id.localeCompare(right.id),
          )),
          points: Object.freeze(
            samples.map((sample) =>
              projectSpacePoint(sample.position, projection),
            ),
          ),
          sampleTimes: Object.freeze(
            samples.map((sample) => sample.timeSeconds),
          ),
        })
      })
      .filter((interval): interval is ModulatedTraceInterval => interval !== null)
      .sort((left, right) => left.startSeconds - right.startSeconds),
  )
}

export const buildCompositionDrawCommands = (
  scene: CompositionScene,
  projection: SpaceProjection,
  options: CompositionDrawOptions = {},
): ReadonlyArray<CompositionDrawCommand> => {
  const commands: Array<CompositionDrawCommand> = [
    Object.freeze({
      kind: 'clear',
      width: projection.width,
      height: projection.height,
      color: options.background ?? '#101014',
    }),
  ]
  const showTraces = options.showTraces ?? true
  const showHeads = options.showHeads ?? true
  const showDebugIds = options.showDebugIds ?? false
  const showFields = options.showFields ?? true
  const showBoundaryLabels = options.showBoundaryLabels ?? false
  const fieldColor = options.fieldColor ?? 'rgba(246, 244, 239, 0.28)'
  const fieldLineWidth = Math.max(0.5, options.fieldLineWidth ?? 1)
  const headRadius = Math.max(1, options.headRadiusPixels ?? 5)

  const pushBoundaryLabel = (
    boundary: { fieldId: string; boundaryId: string; index: number; name: string },
    position: Readonly<Point2>,
  ) => {
    if (!showBoundaryLabels) return
    commands.push(
      Object.freeze({
        kind: 'boundary-label',
        fieldId: boundary.fieldId,
        boundaryId: boundary.boundaryId,
        position,
        text: `${boundary.index}: ${boundary.name}`,
        color: fieldColor,
      }),
    )
  }

  if (showFields) {
    for (const boundary of scene.boundaries) {
      const center = projectSpacePoint(boundary.center, projection)

      if (boundary.kind === 'ring') {
        const radius = boundary.radius * projection.pixelsPerUnit
        commands.push(
          Object.freeze({
            kind: 'ring-boundary',
            fieldId: boundary.fieldId,
            boundaryId: boundary.boundaryId,
            center,
            radius,
            color: fieldColor,
            lineWidth: fieldLineWidth,
          }),
        )

        if (showBoundaryLabels) {
          commands.push(
            Object.freeze({
              kind: 'boundary-label',
              fieldId: boundary.fieldId,
              boundaryId: boundary.boundaryId,
              position: freezePoint({
                x: center.x + radius + 4,
                y: center.y - 4,
              }),
              text: `${boundary.index}: ${boundary.name}`,
              color: fieldColor,
            }),
          )
        }
      } else if (boundary.kind === 'spoke') {
        const length = Math.hypot(projection.width, projection.height) * 2
        if (boundary.angularWidth > 0) {
          const halfWidth = boundary.angularWidth / 2
          commands.push(
            Object.freeze({
              kind: 'wedge-boundary',
              fieldId: boundary.fieldId,
              boundaryId: boundary.boundaryId,
              center,
              left: freezePoint({
                x: center.x + Math.cos(boundary.angle + halfWidth) * length,
                y: center.y - Math.sin(boundary.angle + halfWidth) * length,
              }),
              right: freezePoint({
                x: center.x + Math.cos(boundary.angle - halfWidth) * length,
                y: center.y - Math.sin(boundary.angle - halfWidth) * length,
              }),
              color: fieldColor,
              lineWidth: fieldLineWidth,
              fillOpacity: 0.22,
            }),
          )
        } else {
          const end = freezePoint({
            x: center.x + Math.cos(boundary.angle) * length,
            y: center.y - Math.sin(boundary.angle) * length,
          })
          commands.push(
            Object.freeze({
              kind: 'spoke-boundary',
              fieldId: boundary.fieldId,
              boundaryId: boundary.boundaryId,
              from: center,
              to: end,
              color: fieldColor,
              lineWidth: fieldLineWidth,
            }),
          )
        }

        if (showBoundaryLabels) {
          commands.push(
            Object.freeze({
              kind: 'boundary-label',
              fieldId: boundary.fieldId,
              boundaryId: boundary.boundaryId,
              position: freezePoint({
                x: center.x + Math.cos(boundary.angle) * 28,
                y: center.y - Math.sin(boundary.angle) * 28,
              }),
              text: `${boundary.index}: ${boundary.name}`,
              color: fieldColor,
            }),
          )
        }
      } else if (boundary.kind === 'ellipse') {
        commands.push(
          Object.freeze({
            kind: 'ellipse-boundary',
            fieldId: boundary.fieldId,
            boundaryId: boundary.boundaryId,
            center,
            radiusX: boundary.semiMajor * projection.pixelsPerUnit,
            radiusY: boundary.semiMinor * projection.pixelsPerUnit,
            // Screen y grows downward, so the drawn tilt is the negated angle.
            rotation: -boundary.rotation,
            color: fieldColor,
            lineWidth: fieldLineWidth,
          }),
        )
        pushBoundaryLabel(
          boundary,
          freezePoint({
            x: center.x + boundary.semiMajor * projection.pixelsPerUnit + 4,
            y: center.y - 4,
          }),
        )
      } else if (boundary.kind === 'band') {
        // A band draws as its two edges, so entry and exit are both visible.
        for (const radius of [boundary.innerRadius, boundary.outerRadius]) {
          commands.push(
            Object.freeze({
              kind: 'ring-boundary',
              fieldId: boundary.fieldId,
              boundaryId: boundary.boundaryId,
              center,
              radius: radius * projection.pixelsPerUnit,
              color: fieldColor,
              lineWidth: fieldLineWidth,
            }),
          )
        }
        pushBoundaryLabel(
          boundary,
          freezePoint({
            x: center.x + boundary.outerRadius * projection.pixelsPerUnit + 4,
            y: center.y - 4,
          }),
        )
      } else if (boundary.kind === 'grid') {
        const length = Math.hypot(projection.width, projection.height) * 2
        const cos = Math.cos(boundary.rotation)
        const sin = Math.sin(boundary.rotation)
        // The line runs along the axis orthogonal to the one it offsets.
        const along =
          boundary.axis === 'x'
            ? { x: -sin, y: cos }
            : { x: cos, y: sin }
        const anchor =
          boundary.axis === 'x'
            ? { x: cos * boundary.offset, y: sin * boundary.offset }
            : { x: -sin * boundary.offset, y: cos * boundary.offset }
        const anchorPixels = freezePoint({
          x: center.x + anchor.x * projection.pixelsPerUnit,
          y: center.y - anchor.y * projection.pixelsPerUnit,
        })
        commands.push(
          Object.freeze({
            kind: 'spoke-boundary',
            fieldId: boundary.fieldId,
            boundaryId: boundary.boundaryId,
            from: freezePoint({
              x: anchorPixels.x - along.x * length,
              y: anchorPixels.y + along.y * length,
            }),
            to: freezePoint({
              x: anchorPixels.x + along.x * length,
              y: anchorPixels.y - along.y * length,
            }),
            color: fieldColor,
            lineWidth: fieldLineWidth,
          }),
        )
        pushBoundaryLabel(boundary, anchorPixels)
      } else {
        const steps = Math.max(32, boundary.turns * 48)
        const points: Array<Readonly<Point2>> = []
        for (let step = 0; step <= steps; step += 1) {
          const theta = (step / steps) * boundary.turns * Math.PI * 2
          const radius =
            boundary.startRadius + boundary.growthPerTurn * (theta / (Math.PI * 2))
          const angle = theta + boundary.rotation
          points.push(
            freezePoint({
              x: center.x + Math.cos(angle) * radius * projection.pixelsPerUnit,
              y: center.y - Math.sin(angle) * radius * projection.pixelsPerUnit,
            }),
          )
        }
        commands.push(
          Object.freeze({
            kind: 'polyline-boundary',
            fieldId: boundary.fieldId,
            boundaryId: boundary.boundaryId,
            points: Object.freeze(points),
            color: fieldColor,
            lineWidth: fieldLineWidth,
          }),
        )
        pushBoundaryLabel(boundary, points[points.length - 1] ?? center)
      }
    }
  }

  for (const trace of scene.traces) {
    if (showTraces && trace.style.visible && trace.points.length > 1) {
      const pushTrace = (
        points: ReadonlyArray<Readonly<Point2>>,
        style: Readonly<{
          color: string
          lineWidth: number
          opacity: number
        }>,
        lanes: ReadonlyArray<GateModulationLane> = [],
      ) => {
        if (points.length < 2) return
        commands.push(
          Object.freeze({
            kind: 'trace' as const,
            wheelId: trace.wheelId,
            headId: trace.headId,
            points: Object.freeze([...points]),
            color: style.color,
            lineWidth: style.lineWidth,
            opacity: style.opacity,
            ...(lanes.length === 0
              ? {}
              : {
                  modulationLaneIds: Object.freeze(
                    lanes.map((lane) => lane.id),
                  ),
                  modulationTargets: Object.freeze(
                    lanes.map((lane) => lane.target),
                  ),
                }),
          }),
        )
      }
      const intervals = modulatedIntervalsFor(scene, trace, projection)
      if (intervals.length === 0) {
        pushTrace(
          trace.points.map((item) =>
            projectSpacePoint(item.position, projection),
          ),
          trace.style,
        )
      } else {
        let cursorSeconds = trace.points[0].timeSeconds
        let previousBoundary: Readonly<Point2> | undefined
        for (const interval of intervals) {
          const before = trace.points
            .filter(
              (point) =>
                point.timeSeconds >= cursorSeconds - 1e-12 &&
                point.timeSeconds < interval.startSeconds - 1e-12,
            )
            .map((point) => projectSpacePoint(point.position, projection))
          if (previousBoundary) before.unshift(previousBoundary)
          before.push(interval.points[0])
          pushTrace(before, trace.style)

          // One draw segment per canonical sample interval lets the authored
          // modulation contour remain visible instead of flattening a whole
          // gate visit to one average color or width.
          for (let index = 1; index < interval.points.length; index += 1) {
            pushTrace(
              [interval.points[index - 1], interval.points[index]],
              modulatedTraceStyle(
                trace.style,
                interval.lanes,
                interval.sampleTimes[index - 1],
                interval.sampleTimes[index],
              ),
              interval.lanes,
            )
          }
          previousBoundary = interval.points.at(-1)
          cursorSeconds = interval.endSeconds
        }
        const after = trace.points
          .filter((point) => point.timeSeconds > cursorSeconds + 1e-12)
          .map((point) => projectSpacePoint(point.position, projection))
        if (previousBoundary) after.unshift(previousBoundary)
        pushTrace(after, trace.style)
      }
    }

    const headPosition = projectSpacePoint(trace.head.position, projection)

    if (showHeads) {
      commands.push(
        Object.freeze({
          kind: 'head',
          wheelId: trace.wheelId,
          headId: trace.headId,
          position: headPosition,
          color: trace.style.color,
          radius: headRadius,
          opacity: trace.style.opacity,
        }),
      )
    }

    if (showDebugIds) {
      commands.push(
        Object.freeze({
          kind: 'label',
          wheelId: trace.wheelId,
          headId: trace.headId,
          position: freezePoint({
            x: headPosition.x + headRadius + 4,
            y: headPosition.y - headRadius - 2,
          }),
          text: `${trace.wheelId}/${trace.headId}`,
          color: trace.style.color,
        }),
      )
    }
  }

  return Object.freeze(commands)
}

export const drawCompositionCommands = (
  context: CanvasRenderingContext2D,
  commands: ReadonlyArray<CompositionDrawCommand>,
) => {
  for (const command of commands) {
    if (command.kind === 'clear') {
      context.clearRect(0, 0, command.width, command.height)
      context.fillStyle = command.color
      context.fillRect(0, 0, command.width, command.height)
    } else if (command.kind === 'ring-boundary') {
      context.save()
      context.strokeStyle = command.color
      context.lineWidth = command.lineWidth
      context.beginPath()
      context.arc(
        command.center.x,
        command.center.y,
        command.radius,
        0,
        Math.PI * 2,
      )
      context.stroke()
      context.restore()
    } else if (command.kind === 'spoke-boundary') {
      context.save()
      context.strokeStyle = command.color
      context.lineWidth = command.lineWidth
      context.beginPath()
      context.moveTo(command.from.x, command.from.y)
      context.lineTo(command.to.x, command.to.y)
      context.stroke()
      context.restore()
    } else if (command.kind === 'wedge-boundary') {
      context.save()
      context.strokeStyle = command.color
      context.fillStyle = command.color
      context.lineWidth = command.lineWidth
      context.beginPath()
      context.moveTo(command.center.x, command.center.y)
      context.lineTo(command.left.x, command.left.y)
      context.lineTo(command.right.x, command.right.y)
      context.closePath()
      context.globalAlpha = command.fillOpacity
      context.fill()
      context.globalAlpha = 1
      context.stroke()
      context.restore()
    } else if (command.kind === 'ellipse-boundary') {
      context.save()
      context.strokeStyle = command.color
      context.lineWidth = command.lineWidth
      context.beginPath()
      context.ellipse(
        command.center.x,
        command.center.y,
        command.radiusX,
        command.radiusY,
        command.rotation,
        0,
        Math.PI * 2,
      )
      context.stroke()
      context.restore()
    } else if (command.kind === 'polyline-boundary') {
      if (command.points.length > 1) {
        context.save()
        context.strokeStyle = command.color
        context.lineWidth = command.lineWidth
        context.beginPath()
        context.moveTo(command.points[0].x, command.points[0].y)
        for (let index = 1; index < command.points.length; index += 1) {
          context.lineTo(command.points[index].x, command.points[index].y)
        }
        context.stroke()
        context.restore()
      }
    } else if (command.kind === 'boundary-label') {
      context.save()
      context.fillStyle = command.color
      context.font = '11px ui-monospace, monospace'
      context.fillText(command.text, command.position.x, command.position.y)
      context.restore()
    } else if (command.kind === 'trace') {
      context.save()
      context.globalAlpha = command.opacity
      context.strokeStyle = command.color
      context.lineWidth = command.lineWidth
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      command.points.forEach((item, index) => {
        if (index === 0) context.moveTo(item.x, item.y)
        else context.lineTo(item.x, item.y)
      })
      context.stroke()
      context.restore()
    } else if (command.kind === 'head') {
      context.save()
      context.globalAlpha = command.opacity
      context.fillStyle = command.color
      context.beginPath()
      context.arc(
        command.position.x,
        command.position.y,
        command.radius,
        0,
        Math.PI * 2,
      )
      context.fill()
      context.restore()
    } else {
      context.save()
      context.fillStyle = command.color
      context.font = '12px ui-monospace, monospace'
      context.fillText(command.text, command.position.x, command.position.y)
      context.restore()
    }
  }
}
