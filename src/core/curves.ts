import type { CurveFamily, SpirophonicModel } from './model'
import {
  generateSpiroPoints,
  greatestCommonDivisor,
  type SpiroPoint,
} from './trochoid'

type Geometry = SpirophonicModel['geometry']

const TAU = Math.PI * 2

/** A closed curve as its parameter range and a point function over it. */
type ParametricCurve = {
  end: number
  at: (theta: number) => [number, number]
}

export type HarmonographPointParameters = {
  theta: number
  frequencyX: number
  frequencyY: number
  delta: number
  damping: number
  amplitudeX?: number
  amplitudeY?: number
  phaseX?: number
  phaseY?: number
  decayTheta?: number
}

export const curveFamilies: Array<CurveFamily> = [
  'spirogram',
  'lissajous',
  'rose',
  'superformula',
  'harmonograph',
]

export const generateCurvePoints = (
  model: Pick<SpirophonicModel, 'geometry'>,
): Array<SpiroPoint> => {
  const { geometry } = model

  if (geometry.family === 'spirogram') {
    return generateSpiroPoints(model)
  }

  const points =
    geometry.family === 'harmonograph'
      ? harmonographPoints(geometry)
      : sample(geometry, parametricCurve(geometry))

  return close(fit(points, geometry.fixedRadius))
}

const parametricCurve = (geometry: Geometry): ParametricCurve => {
  if (geometry.family === 'lissajous') {
    return lissajous(geometry)
  }

  if (geometry.family === 'rose') {
    return rose(geometry)
  }

  return superformula(geometry)
}

/** x = sin(a*theta + delta), y = sin(b*theta); closes at TAU / gcd(a, b). */
const lissajous = (geometry: Geometry): ParametricCurve => {
  const a = Math.max(1, Math.round(geometry.lissFreqX))
  const b = Math.max(1, Math.round(geometry.lissFreqY))
  const delta = geometry.lissDelta

  return {
    end: TAU / greatestCommonDivisor(a, b),
    at: (theta) => lissajousPointAtTheta(theta, a, b, delta),
  }
}

export const lissajousPointAtTheta = (
  theta: number,
  frequencyX: number,
  frequencyY: number,
  phaseX = 0,
  phaseY = 0,
): [number, number] => [
  Math.sin(frequencyX * theta + phaseX),
  Math.sin(frequencyY * theta + phaseY),
]

/** r = cos(k*theta), k = n/d reduced; closes at pi*d when n*d is odd. */
const rose = (geometry: Geometry): ParametricCurve => {
  const divisor = greatestCommonDivisor(
    Math.max(1, Math.round(geometry.roseN)),
    Math.max(1, Math.round(geometry.roseD)),
  )
  const n = Math.max(1, Math.round(geometry.roseN)) / divisor
  const d = Math.max(1, Math.round(geometry.roseD)) / divisor
  const k = n / d

  return {
    end: (n * d) % 2 === 1 ? Math.PI * d : TAU * d,
    at: (theta) => rosePointAtTheta(theta, k),
  }
}

export const rosePointAtTheta = (
  theta: number,
  ratio: number,
): [number, number] => {
  const radius = Math.cos(ratio * theta)

  return [radius * Math.cos(theta), radius * Math.sin(theta)]
}

/** Gielis supershape with a = b = 1; closes at TAU when m is even. */
const superformula = (geometry: Geometry): ParametricCurve => {
  const m = Math.max(0, Math.round(geometry.sfM))
  const { sfN1, sfN2, sfN3 } = geometry

  return {
    end: m % 2 === 0 ? TAU : 2 * TAU,
    at: (theta) => superformulaPointAtTheta(theta, m, sfN1, sfN2, sfN3),
  }
}

export const superformulaPointAtTheta = (
  theta: number,
  symmetry: number,
  n1: number,
  n2: number,
  n3: number,
): [number, number] => {
  const u = (symmetry * theta) / 4
  const base = Math.abs(Math.cos(u)) ** n2 + Math.abs(Math.sin(u)) ** n3
  const raw = base ** (-1 / n1)
  const radius = Number.isFinite(raw) ? Math.min(raw, 1e9) : 0

  return [radius * Math.cos(theta), radius * Math.sin(theta)]
}

export const harmonographPointAtTheta = ({
  theta,
  frequencyX,
  frequencyY,
  delta,
  damping,
  amplitudeX = 1,
  amplitudeY = 1,
  phaseX = 0,
  phaseY = 0,
  decayTheta = theta,
}: HarmonographPointParameters): [number, number] => {
  const envelope = Math.exp(-damping * decayTheta)

  return [
    amplitudeX * Math.sin(frequencyX * theta + delta + phaseX) * envelope,
    amplitudeY * Math.sin(frequencyY * theta + phaseY) * envelope,
  ]
}

/**
 * A damped lissajous traced forward and then retraced in reverse. The decay
 * leaves the curve open, so the palindrome is what closes it: the endpoint
 * lands exactly on the start, and the interior is walked twice.
 */
const harmonographPoints = (geometry: Geometry): Array<SpiroPoint> => {
  const end = Math.max(1, Math.round(geometry.harmTurns)) * TAU
  const count = Math.max(2, Math.round(geometry.samples))
  const forward = Math.floor(count / 2) + 1
  const outbound: Array<[number, number]> = Array.from(
    { length: forward },
    (_, index) => {
      const theta = (index / (forward - 1)) * end + geometry.phase

      return harmonographPointAtTheta({
        theta,
        frequencyX: geometry.harmFreqX,
        frequencyY: geometry.harmFreqY,
        delta: geometry.harmDelta,
        damping: geometry.harmDamping,
      })
    },
  )
  const path = [...outbound, ...outbound.slice(0, -1).reverse()]
  const last = path.length - 1

  return path.map(([x, y], index) => point(index / last, x, y))
}

const sample = (geometry: Geometry, curve: ParametricCurve): Array<SpiroPoint> => {
  const count = Math.max(2, Math.round(geometry.samples))

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const [x, y] = curve.at(progress * curve.end + geometry.phase)

    return point(progress, x, y)
  })
}

/**
 * Every family but the spirogram is defined on the unit circle, while the
 * spirogram is defined in pixels. Scaling each curve so its widest reach
 * matches the fixed radius puts them all on one comparable footing, and keeps
 * the superformula's unbounded radius on screen.
 */
const fit = (points: Array<SpiroPoint>, fixedRadius: number): Array<SpiroPoint> => {
  const reach = points.reduce((max, item) => Math.max(max, item.radius), 0)

  if (reach <= Number.EPSILON) {
    return points
  }

  const scale = Math.abs(fixedRadius) / reach

  return points.map((item) => point(item.t, item.x * scale, item.y * scale))
}

/**
 * Closure is exact by construction, but fractional exponents amplify float
 * residue at the wrap. Snapping the endpoint keeps seam-aware event extraction
 * from seeing a gap that is not there.
 */
const close = (points: Array<SpiroPoint>): Array<SpiroPoint> => {
  if (points.length < 2) {
    return points
  }

  return [...points.slice(0, -1), { ...points[0], t: 1 }]
}

const point = (t: number, x: number, y: number): SpiroPoint => ({
  t,
  x,
  y,
  radius: Math.hypot(x, y),
  angle: Math.atan2(y, x),
})
