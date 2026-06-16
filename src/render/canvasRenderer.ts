import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/spirograph'
import { pointToHsl } from './color'

export type DrawTraceOptions = {
  activeIndex?: number
  revealProgress?: number
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
  const maxIndex = Math.max(
    1,
    Math.floor(
      (options.revealProgress ?? 1) * Math.max(1, points.length - 1),
    ),
  )

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#101014'
  context.fillRect(0, 0, width, height)

  if (points.length < 2) {
    return
  }

  const transform = getCanvasTransform(points, width, height)

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

  const activePoint = points[options.activeIndex ?? maxIndex]
  if (activePoint) {
    const active = transformPoint(activePoint, transform)

    context.beginPath()
    context.arc(active.x, active.y, 6, 0, Math.PI * 2)
    context.fillStyle = '#f6f4ef'
    context.fill()
  }
}

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

