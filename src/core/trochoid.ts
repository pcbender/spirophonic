const safeDivisor = (value: number) => {
  if (Math.abs(value) < Number.EPSILON) {
    return value < 0 ? -Number.EPSILON : Number.EPSILON
  }
  return value
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

export const hypotrochoidPointAtTheta = (
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

export const epitrochoidPointAtTheta = (
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
