import type { SpirophonicModel } from './model'
import type { SpiroPoint } from './spirograph'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const normalize = (value: number, min: number, max: number) => {
  if (min === max) {
    return 0
  }

  return clamp((value - min) / (max - min), 0, 1)
}

export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => outMin + normalize(value, inMin, inMax) * (outMax - outMin)

export const getPointBounds = (points: Array<SpiroPoint>) =>
  points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
      minRadius: Math.min(bounds.minRadius, point.radius),
      maxRadius: Math.max(bounds.maxRadius, point.radius),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minRadius: Number.POSITIVE_INFINITY,
      maxRadius: Number.NEGATIVE_INFINITY,
    },
  )

export const pointToFrequency = (
  point: SpiroPoint,
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
) => {
  const bounds = getPointBounds(points)
  const { minFrequencyHz, maxFrequencyHz, baseFrequencyHz, frequencyMode } =
    model.sound

  if (frequencyMode === 'ratio') {
    const ratio = 1 + normalize(point.radius, bounds.minRadius, bounds.maxRadius)
    return clamp(
      baseFrequencyHz * ratio,
      Math.min(minFrequencyHz, maxFrequencyHz),
      Math.max(minFrequencyHz, maxFrequencyHz),
    )
  }

  const normalized =
    frequencyMode === 'x'
      ? normalize(point.x, bounds.minX, bounds.maxX)
      : frequencyMode === 'y'
        ? normalize(point.y, bounds.minY, bounds.maxY)
        : frequencyMode === 'angle'
          ? normalizeAngle(point.angle)
          : normalize(point.radius, bounds.minRadius, bounds.maxRadius)

  return mapRange(normalized, 0, 1, minFrequencyHz, maxFrequencyHz)
}

export const pointToPan = (point: SpiroPoint, points: Array<SpiroPoint>) => {
  const bounds = getPointBounds(points)

  return mapRange(point.x, bounds.minX, bounds.maxX, -1, 1)
}

export const approximateVelocity = (
  points: Array<SpiroPoint>,
  index: number,
) => {
  if (points.length < 2) {
    return 0
  }

  const previous = points[Math.max(0, index - 1)]
  const next = points[Math.min(points.length - 1, index + 1)]

  return Math.hypot(next.x - previous.x, next.y - previous.y)
}

export const approximateCurvature = (
  points: Array<SpiroPoint>,
  index: number,
) => {
  const previous = points[index - 1]
  const current = points[index]
  const next = points[index + 1]

  if (!previous || !current || !next) {
    return 0
  }

  const a1 = Math.atan2(current.y - previous.y, current.x - previous.x)
  const a2 = Math.atan2(next.y - current.y, next.x - current.x)

  return Math.abs(normalizeSignedAngle(a2 - a1))
}

export const pointToHue = (
  point: SpiroPoint,
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
  index: number,
) => {
  const bounds = getPointBounds(points)
  const source = model.color.hueSource

  if (source === 'radius') {
    return mapRange(point.radius, bounds.minRadius, bounds.maxRadius, 0, 360)
  }

  if (source === 'velocity') {
    const velocities = points.map((_, velocityIndex) =>
      approximateVelocity(points, velocityIndex),
    )
    return mapRange(
      approximateVelocity(points, index),
      Math.min(...velocities),
      Math.max(...velocities),
      0,
      360,
    )
  }

  if (source === 'curvature') {
    return mapRange(approximateCurvature(points, index), 0, Math.PI, 0, 360)
  }

  return normalizeAngle(point.angle) * 360
}

export const normalizeAngle = (angle: number) => {
  const tau = Math.PI * 2
  const normalized = ((angle % tau) + tau) % tau

  return normalized / tau
}

const normalizeSignedAngle = (angle: number) => {
  const tau = Math.PI * 2

  return ((angle + Math.PI) % tau) - Math.PI
}

