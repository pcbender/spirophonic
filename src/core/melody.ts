import type { MelodyContourSpec, ScaleName } from './composition'
import { scaleIntervals } from './scales'

export type ContourStep = Readonly<{
  index: number
  degree: number
  midiNote: number
  direction: -1 | 0 | 1
}>

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

/**
 * Walks a scale to build a line, rather than mapping each source value to a
 * pitch independently.
 *
 * The source contributes direction and magnitude of movement; the line itself
 * carries the state. Two neighbouring samples that happen to land on similar
 * coordinates therefore produce a step, not a repeated note, and a steadily
 * rising source produces a steadily rising line instead of a scatter.
 *
 * It stays deterministic: the same values and spec always produce the same
 * line, with no clock, randomness, or hidden accumulator beyond the degree.
 *
 * `segments` is what keeps that accumulator from running forever. The degree
 * is a running sum, so periodic geometry produced a line that never repeated:
 * the *steps* recurred every cycle, but the degree they were applied to had
 * drifted, and only the reflecting bounds kept it in range at all. Passing a
 * key per value restarts the walk at `startDegree` whenever the key changes,
 * so a repeating input produces a repeating line. Omit it and the walk runs
 * unbroken, which is what `anchor: 'none'` asks for.
 */
export const buildMelodicContour = (
  values: ReadonlyArray<number>,
  spec: MelodyContourSpec,
  scale: ScaleName,
  rootMidiNote: number,
  segments?: ReadonlyArray<number>,
): ReadonlyArray<ContourStep> => {
  if (spec.maxStep < 0) throw new RangeError('maxStep must be non-negative.')
  if (spec.lowDegree > spec.highDegree) {
    throw new RangeError('lowDegree must not exceed highDegree.')
  }

  const intervals = scaleIntervals[scale]
  const bias = clamp(spec.directionBias, 0, 1)
  const steps: Array<ContourStep> = []
  let degree = clamp(spec.startDegree, spec.lowDegree, spec.highDegree)

  const midiForDegree = (value: number) => {
    const size = intervals.length
    const octave = Math.floor(value / size)
    const within = ((value % size) + size) % size
    return rootMidiNote + octave * 12 + intervals[within]
  }

  for (let index = 0; index < values.length; index += 1) {
    let direction: -1 | 0 | 1 = 0
    // A new segment starts the line over, so the first note of every bar is
    // the same note and the phrase inside it is repeatable.
    const restarts =
      index === 0 ||
      (segments !== undefined && segments[index] !== segments[index - 1])

    if (!restarts) {
      const delta = values[index] - values[index - 1]
      // The source's own movement decides which way the line goes.
      direction = delta > 0 ? 1 : delta < 0 ? -1 : 0
    }

    if (restarts) {
      degree = clamp(spec.startDegree, spec.lowDegree, spec.highDegree)
      steps.push({
        index,
        degree,
        midiNote: midiForDegree(degree),
        direction: 0,
      })
      continue
    }

    const span = Math.abs(values[index] - values[index - 1])
    // Magnitude scales the step; bias decides how literally to follow the
    // source. At bias 0 the line still moves, but only by a single degree.
    const scaled = Math.round(span * spec.maxStep * bias)
    const move = Math.max(direction === 0 ? 0 : 1, Math.min(spec.maxStep, scaled))
    const next = degree + direction * move

    // Reflect at the range edges so the line turns around instead of flattening
    // against a clamp and repeating the same note.
    if (next < spec.lowDegree) {
      degree = spec.lowDegree + (spec.lowDegree - next)
      direction = 1
    } else if (next > spec.highDegree) {
      degree = spec.highDegree - (next - spec.highDegree)
      direction = -1
    } else {
      degree = next
    }
    degree = clamp(degree, spec.lowDegree, spec.highDegree)

    steps.push({
      index,
      degree,
      midiNote: midiForDegree(degree),
      direction,
    })
  }

  return Object.freeze(steps)
}

/** Normalizes any source series into [0, 1] so contour steps are comparable. */
export const normalizeSeries = (
  values: ReadonlyArray<number>,
): ReadonlyArray<number> => {
  if (values.length === 0) return Object.freeze([])
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low
  const tolerance = Math.max(Math.abs(low), Math.abs(high), 1) * 1e-9

  return Object.freeze(
    span <= tolerance
      ? values.map(() => 0.5)
      : values.map((value) => (value - low) / span),
  )
}
