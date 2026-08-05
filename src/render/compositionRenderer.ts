import type {
  Composition,
  Point2,
  SpaceSpec,
  TracePresentationSpec,
} from '../core/composition'
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
      } else {
        const length = Math.hypot(projection.width, projection.height) * 2
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
      }
    }
  }

  for (const trace of scene.traces) {
    if (showTraces && trace.style.visible && trace.points.length > 1) {
      commands.push(
        Object.freeze({
          kind: 'trace',
          wheelId: trace.wheelId,
          headId: trace.headId,
          points: Object.freeze(
            trace.points.map((item) =>
              projectSpacePoint(item.position, projection),
            ),
          ),
          color: trace.style.color,
          lineWidth: trace.style.lineWidth,
          opacity: trace.style.opacity,
        }),
      )
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
