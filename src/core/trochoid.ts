import type { SpirophonicModel } from './model'

export type SpiroPoint = {
  t: number
  x: number
  y: number
  radius: number
  angle: number
}

const TAU = Math.PI * 2

const safeDivisor = (value: number) => {
  if (Math.abs(value) < Number.EPSILON) {
    return value < 0 ? -Number.EPSILON : Number.EPSILON
  }

  return value
}

const getCycleEnd = (fixedRadius: number, movingRadius: number) => {
  const fixed = Math.max(1, Math.round(Math.abs(fixedRadius)))
  const moving = Math.max(1, Math.round(Math.abs(movingRadius)))
  const divisor = greatestCommonDivisor(fixed, moving)

  return TAU * (moving / divisor)
}

export const greatestCommonDivisor = (a: number, b: number): number => {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))

  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }

  return x || 1
}

export const generateSpiroPoints = (
  model: Pick<SpirophonicModel, 'geometry'>,
): Array<SpiroPoint> => {
  const { fixedRadius, movingRadius, penOffset, phase, rotation, samples } =
    model.geometry
  const pointCount = Math.max(2, Math.round(samples))
  const end = getCycleEnd(fixedRadius, movingRadius)
  const points: Array<SpiroPoint> = []

  for (let index = 0; index < pointCount; index += 1) {
    const progress = index / (pointCount - 1)
    const theta = progress * end + phase
    const point =
      rotation === 'inside'
        ? getHypotrochoidPoint(theta, fixedRadius, movingRadius, penOffset)
        : getEpitrochoidPoint(theta, fixedRadius, movingRadius, penOffset)

    points.push({
      t: progress,
      x: point.x,
      y: point.y,
      radius: Math.hypot(point.x, point.y),
      angle: Math.atan2(point.y, point.x),
    })
  }

  return points
}

const getHypotrochoidPoint = (
  theta: number,
  fixedRadius: number,
  movingRadius: number,
  penOffset: number,
) => {
  const radiusDelta = fixedRadius - movingRadius
  const ratio = radiusDelta / safeDivisor(movingRadius)

  return {
    x: radiusDelta * Math.cos(theta) + penOffset * Math.cos(ratio * theta),
    y: radiusDelta * Math.sin(theta) - penOffset * Math.sin(ratio * theta),
  }
}

const getEpitrochoidPoint = (
  theta: number,
  fixedRadius: number,
  movingRadius: number,
  penOffset: number,
) => {
  const radiusSum = fixedRadius + movingRadius
  const ratio = radiusSum / safeDivisor(movingRadius)

  return {
    x: radiusSum * Math.cos(theta) - penOffset * Math.cos(ratio * theta),
    y: radiusSum * Math.sin(theta) - penOffset * Math.sin(ratio * theta),
  }
}

