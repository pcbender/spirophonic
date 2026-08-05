import { describe, expect, it } from 'vitest'

import {
  frequencyToMidi,
  fromScaleDegree,
  midiToFrequency,
  midiToName,
  quantizeFrequency,
  quantizeToScale,
  scaleMidiForDegree,
  scaleMidiForUnitValue,
  scaleIntervals,
  scaleNames,
  toScaleDegree,
} from './scales'

describe('frequency and note conversion', () => {
  it('anchors on A440', () => {
    expect(frequencyToMidi(440)).toBe(69)
    expect(midiToFrequency(69)).toBe(440)
  })

  it('moves an octave for a doubling', () => {
    expect(frequencyToMidi(880)).toBeCloseTo(81, 9)
    expect(midiToFrequency(57)).toBeCloseTo(220, 9)
  })

  it('round-trips', () => {
    for (const note of [21, 40, 60, 69, 96, 108]) {
      expect(frequencyToMidi(midiToFrequency(note))).toBeCloseTo(note, 9)
    }
  })

  it('survives a silent input', () => {
    expect(frequencyToMidi(0)).toBe(0)
    expect(frequencyToMidi(-10)).toBe(0)
  })

  it('names notes', () => {
    expect(midiToName(60)).toBe('C4')
    expect(midiToName(69)).toBe('A4')
    expect(midiToName(61)).toBe('C#4')
  })
})

describe('quantizeToScale', () => {
  it('leaves chromatic quantization as plain rounding', () => {
    for (const note of [60, 60.2, 61.7, 66.5, 71.4]) {
      expect(quantizeToScale(note, 'chromatic', 60)).toBe(Math.round(note))
    }
  })

  it('lands only on members of the scale', () => {
    for (const scale of scaleNames) {
      const intervals = scaleIntervals[scale]

      for (let note = 48; note <= 84; note += 0.37) {
        const quantized = quantizeToScale(note, scale, 60)
        const within = ((quantized - 60) % 12 + 12) % 12

        expect(intervals).toContain(within)
      }
    }
  })

  it('pulls a note to its nearest degree', () => {
    // Just above D, which is in C major, so it stays.
    expect(quantizeToScale(62.6, 'major', 60)).toBe(62)
    // F# is not in C major, and G is closer than F.
    expect(quantizeToScale(66.6, 'major', 60)).toBe(67)
  })

  it('snaps up into the next octave when that is nearer', () => {
    expect(quantizeToScale(71.8, 'pentatonic-major', 60)).toBe(72)
  })

  it('works below the root', () => {
    expect(quantizeToScale(56.7, 'major', 60)).toBe(57)
  })

  it('resolves a tie upward, the way rounding does', () => {
    // D# sits exactly between D and E in C major.
    expect(quantizeToScale(63, 'major', 60)).toBe(64)
    expect(quantizeToScale(63, 'major', 60)).toBe(quantizeToScale(63, 'major', 60))
  })
})

describe('scale degrees', () => {
  it('numbers the degrees of a scale in order', () => {
    expect(toScaleDegree(60, 'major', 60)).toBe(0)
    expect(toScaleDegree(62, 'major', 60)).toBe(1)
    expect(toScaleDegree(64, 'major', 60)).toBe(2)
    expect(toScaleDegree(72, 'major', 60)).toBe(7)
  })

  it('counts backwards below the root', () => {
    expect(toScaleDegree(59, 'major', 60)).toBe(-1)
    expect(toScaleDegree(48, 'major', 60)).toBe(-7)
  })

  it('round-trips through the note number', () => {
    for (const scale of scaleNames) {
      for (let degree = -9; degree <= 9; degree += 1) {
        const note = fromScaleDegree(degree, scale, 60)

        expect(toScaleDegree(note, scale, 60)).toBe(degree)
      }
    }
  })

  it('adapts stable Boundary degrees into a declared octave range', () => {
    expect(scaleMidiForDegree(0, 'major', 60, 1)).toBe(60)
    expect(scaleMidiForDegree(6, 'major', 60, 1)).toBe(71)
    expect(scaleMidiForDegree(7, 'major', 60, 1)).toBe(60)
    expect(scaleMidiForDegree(12, 'pentatonic-minor', 48, 0)).toBe(48)
  })

  it('maps normalized relationship values across scale degrees', () => {
    expect(scaleMidiForUnitValue(0, 'pentatonic-major', 60, 1)).toBe(60)
    expect(scaleMidiForUnitValue(0.5, 'pentatonic-major', 60, 1)).toBe(64)
    expect(scaleMidiForUnitValue(1, 'pentatonic-major', 60, 1)).toBe(69)
  })
})

describe('quantizeFrequency', () => {
  it('pulls a frequency onto the scale', () => {
    // A#4 is absent from C major and sits exactly between A and B, so the
    // upward tie rule reaches B4. Built from the note number rather than a
    // rounded 466.16, which lands a hair below the semitone and is no tie.
    expect(quantizeFrequency(midiToFrequency(70), 'major', 60)).toBeCloseTo(
      midiToFrequency(71),
      6,
    )
  })

  it('leaves a frequency already in the scale alone', () => {
    // A is the root of A minor, so it survives untouched.
    expect(quantizeFrequency(440, 'minor', 69)).toBeCloseTo(440, 6)
  })

  it('replaces a note outside the scale', () => {
    // A natural is not in C minor, which reaches Ab below it and Bb above.
    expect(quantizeFrequency(440, 'minor', 60)).toBeCloseTo(466.16, 1)
  })
})
