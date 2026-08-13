/** Pure point evaluators shared by the v1 Wheel motion engine. */

import type { WaveShape } from './composition'

const TAU = Math.PI * 2
const squareConnectorHalfWidth = 0.05
const sawtoothResetStart = 0.9

const wrapTurn = (turn: number) => {
  const wrapped = turn - Math.floor(turn)
  return Object.is(wrapped, -0) ? 0 : wrapped
}

/**
 * A normalized, periodic waveform in [-1, 1]. Square and sawtooth deliberately
 * spend a fixed part of each period traversing their sharp connector: a Head
 * therefore moves continuously through Space instead of teleporting between
 * radii and inventing sample-dependent crossings.
 */
export const waveformValueAtTurn = (
  waveform: WaveShape,
  turn: number,
): number => {
  if (!Number.isFinite(turn)) {
    throw new RangeError('Waveform turn must be a finite number.')
  }

  const phase = wrapTurn(turn)

  if (waveform === 'sine') return Math.sin(phase * TAU)
  if (waveform === 'triangle') return 1 - 4 * Math.abs(phase - 0.5)

  if (waveform === 'square') {
    if (phase < squareConnectorHalfWidth) {
      return phase / squareConnectorHalfWidth
    }
    if (phase < 0.5 - squareConnectorHalfWidth) return 1
    if (phase < 0.5 + squareConnectorHalfWidth) {
      return 1 - (phase - (0.5 - squareConnectorHalfWidth)) /
        squareConnectorHalfWidth
    }
    if (phase < 1 - squareConnectorHalfWidth) return -1
    return -1 + (phase - (1 - squareConnectorHalfWidth)) /
      squareConnectorHalfWidth
  }

  if (waveform === 'sawtooth') {
    if (phase < sawtoothResetStart) {
      return -1 + (2 * phase) / sawtoothResetStart
    }
    return 1 - (2 * (phase - sawtoothResetStart)) /
      (1 - sawtoothResetStart)
  }

  const exhaustive: never = waveform
  throw new RangeError(`Unsupported waveform "${exhaustive}".`)
}

export const radialWavePointAtTurn = (
  turn: number,
  waveform: WaveShape,
  amplitude: number,
  periodicity: number,
  baseRadius: number,
): [number, number] => {
  const closedTurn = wrapTurn(turn)
  const theta = closedTurn * TAU
  const radius =
    baseRadius + amplitude * waveformValueAtTurn(
      waveform,
      closedTurn * periodicity,
    )

  return [radius * Math.cos(theta), radius * Math.sin(theta)]
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
