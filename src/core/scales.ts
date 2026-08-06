import type { ScaleName } from './composition'

export type { ScaleName }

/** Semitone offsets from the root, one octave of each scale. */
export const scaleIntervals: Record<ScaleName, Array<number>> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
}

export const scaleNames = Object.keys(scaleIntervals) as Array<ScaleName>

export const noteNames = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

/** A440 is MIDI note 69, the anchor both directions are defined against. */
export const frequencyToMidi = (hz: number) => {
  if (!(hz > 0)) {
    return 0
  }

  return 69 + 12 * Math.log2(hz / 440)
}

export const midiToFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12)

export const midiToName = (note: number) => {
  const rounded = Math.round(note)
  const octave = Math.floor(rounded / 12) - 1

  return `${noteNames[((rounded % 12) + 12) % 12]}${octave}`
}

/**
 * Snaps a continuous note number onto the nearest degree of a scale. Ties
 * resolve upward, which keeps chromatic quantization identical to Math.round.
 */
export const quantizeToScale = (note: number, scale: ScaleName, root: number) => {
  const intervals = scaleIntervals[scale]
  const relative = note - root
  const octave = Math.floor(relative / 12)
  const within = relative - octave * 12
  // The next octave's first degree is a candidate too, so a note just under
  // the octave snaps upward instead of falling back to the degree below it.
  const candidates = [...intervals, 12 + intervals[0]]

  let best = candidates[0]

  for (const candidate of candidates) {
    if (Math.abs(within - candidate) <= Math.abs(within - best)) {
      best = candidate
    }
  }

  return root + octave * 12 + best
}

/**
 * The index of a note within a scale, counting across octaves. This is what
 * Strudel's `n()` takes when paired with `.scale()`.
 */
export const toScaleDegree = (note: number, scale: ScaleName, root: number) => {
  const intervals = scaleIntervals[scale]
  const quantized = quantizeToScale(note, scale, root)
  const relative = quantized - root
  const octave = Math.floor(relative / 12)
  const within = relative - octave * 12
  const step = intervals.indexOf(within)

  // A note landing on the wrapped candidate is the next octave's root.
  if (step < 0) {
    return (octave + 1) * intervals.length
  }

  return octave * intervals.length + step
}

export const fromScaleDegree = (degree: number, scale: ScaleName, root: number) => {
  const intervals = scaleIntervals[scale]
  const octave = Math.floor(degree / intervals.length)
  const step = degree - octave * intervals.length

  return root + octave * 12 + intervals[step]
}

export const quantizeFrequency = (hz: number, scale: ScaleName, root: number) =>
  midiToFrequency(quantizeToScale(frequencyToMidi(hz), scale, root))

/**
 * Resolves an explicit scale degree while keeping the Part inside its declared
 * octave range. Reordering may deliberately remap degrees, but the Boundary's
 * stable ID and every source Encounter identity remain unchanged.
 */
export const scaleMidiForDegree = (
  degree: number,
  scale: ScaleName,
  root: number,
  octaves: number,
) => {
  const octaveCount = Math.max(0, Math.floor(octaves))
  const degreeCount = scaleIntervals[scale].length * octaveCount
  const wrappedDegree =
    degreeCount === 0
      ? 0
      : ((Math.floor(degree) % degreeCount) + degreeCount) % degreeCount

  return fromScaleDegree(wrappedDegree, scale, root)
}

/** Maps a normalized relationship measurement across a Part's scale range. */
export const scaleMidiForUnitValue = (
  value: number,
  scale: ScaleName,
  root: number,
  octaves: number,
) => {
  const octaveCount = Math.max(0, Math.floor(octaves))
  const degreeCount = scaleIntervals[scale].length * octaveCount

  if (degreeCount === 0) return root

  const unit = Math.min(1, Math.max(0, value))
  const degree = Math.min(degreeCount - 1, Math.floor(unit * degreeCount))

  return fromScaleDegree(degree, scale, root)
}
