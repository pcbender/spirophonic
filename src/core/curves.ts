/** Pure point evaluators shared by the v1 Wheel motion engine. */

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

export const rosePointAtTheta = (
  theta: number,
  ratio: number,
): [number, number] => {
  const radius = Math.cos(ratio * theta)
  return [radius * Math.cos(theta), radius * Math.sin(theta)]
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
