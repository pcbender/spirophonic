import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/trochoid'
import { pointToHsl } from './color'

export type VoiceTrace = {
  points: Array<SpiroPoint>
  color: string
  onsets: Array<number>
}

export type DrawTraceOptions = {
  activeIndex?: number
  revealProgress?: number
  showActivePoint?: boolean
  /** Enabled voices, drawn behind the main trace as the composition. */
  voices?: Array<VoiceTrace>
}

const padding = 36

export const drawSpiroTrace = (
  context: CanvasRenderingContext2D,
  points: Array<SpiroPoint>,
  model: SpirophonicModel,
  options: DrawTraceOptions = {},
) => {
  const { canvas } = context
  const width = canvas.width
  const height = canvas.height
  const revealProgress = clampProgress(options.revealProgress ?? 1)
  const lastIndex = Math.max(1, points.length - 1)
  const maxIndex =
    revealProgress >= 1 ? lastIndex : Math.floor(revealProgress * lastIndex)

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#101014'
  context.fillRect(0, 0, width, height)

  if (points.length < 2 || revealProgress <= 0 || maxIndex < 1) {
    return
  }

  const voices = options.voices ?? []
  // One transform over every curve, so the parts stay in register instead of
  // each being fitted to its own bounding box.
  const transform = getCanvasTransform(
    [...points, ...voices.flatMap((voice) => voice.points)],
    width,
    height,
  )

  drawVoices(context, voices, transform)

  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(1.5, Math.min(width, height) * 0.003)

  for (let index = 1; index <= maxIndex; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const from = transformPoint(previous, transform)
    const to = transformPoint(current, transform)

    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.strokeStyle = pointToHsl(current, model, points, index)
    context.stroke()
  }

  const activePoint = options.showActivePoint
    ? points[options.activeIndex ?? maxIndex]
    : undefined
  if (activePoint) {
    const active = transformPoint(activePoint, transform)

    context.beginPath()
    context.arc(active.x, active.y, 6, 0, Math.PI * 2)
    context.fillStyle = '#f6f4ef'
    context.fill()
  }
}

/**
 * Draws each voice's curve faintly and marks where its onsets fire, so the
 * rhythm is visible as points on a shape rather than only audible.
 */
const drawVoices = (
  context: CanvasRenderingContext2D,
  voices: Array<VoiceTrace>,
  transform: ReturnType<typeof getCanvasTransform>,
) => {
  for (const voice of voices) {
    if (voice.points.length < 2) {
      continue
    }

    context.save()
    context.globalAlpha = 0.28
    context.strokeStyle = voice.color
    context.lineWidth = Math.max(1, Math.min(transform.width, transform.height) * 0.0016)
    context.beginPath()

    voice.points.forEach((point, index) => {
      const at = transformPoint(point, transform)

      if (index === 0) {
        context.moveTo(at.x, at.y)
      } else {
        context.lineTo(at.x, at.y)
      }
    })

    context.stroke()
    context.globalAlpha = 0.9
    context.fillStyle = voice.color

    for (const onset of voice.onsets) {
      const index = Math.min(
        voice.points.length - 1,
        Math.max(0, Math.round(onset * (voice.points.length - 1))),
      )
      const at = transformPoint(voice.points[index], transform)

      context.beginPath()
      context.arc(at.x, at.y, 4, 0, Math.PI * 2)
      context.fill()
    }

    context.restore()
  }
}

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress))

const getCanvasTransform = (
  points: Array<SpiroPoint>,
  width: number,
  height: number,
) => {
  const bounds = points.reduce(
    (currentBounds, point) => ({
      minX: Math.min(currentBounds.minX, point.x),
      maxX: Math.max(currentBounds.maxX, point.x),
      minY: Math.min(currentBounds.minY, point.y),
      maxY: Math.max(currentBounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )
  const traceWidth = Math.max(1, bounds.maxX - bounds.minX)
  const traceHeight = Math.max(1, bounds.maxY - bounds.minY)
  const scale = Math.min(
    (width - padding * 2) / traceWidth,
    (height - padding * 2) / traceHeight,
  )

  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    scale,
    width,
    height,
  }
}

const transformPoint = (
  point: SpiroPoint,
  transform: ReturnType<typeof getCanvasTransform>,
) => ({
  x: (point.x - transform.centerX) * transform.scale + transform.width / 2,
  y: (point.y - transform.centerY) * transform.scale * -1 + transform.height / 2,
})
