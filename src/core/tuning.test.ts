import { describe, expect, it } from 'vitest'

import type { Composition, TuningContextSpec } from './composition'
import { defaultComposition } from './defaultComposition'
import { buildMelodicContour, normalizeSeries } from './melody'
import {
  describeRatio,
  frequencyForRatio,
  octaveFoldRatio,
  rationalApproximation,
  ratioFromMotion,
  ratioToCents,
  reduceRatio,
  resolveRatioSource,
} from './tuning'

const lissajous = (frequencyX: number, frequencyY: number): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.wheels[0].motion = {
    kind: 'lissajous',
    frequencyX,
    frequencyY,
    delta: Math.PI / 2,
  }
  composition.wheels[0].heads[0].attachment = {
    kind: 'lissajous',
    scaleX: 100,
    scaleY: 100,
    phaseX: 0,
    phaseY: 0,
  }
  return composition
}

const rationalContext: TuningContextSpec = {
  id: 'tuning-just',
  name: 'Just',
  rootFrequencyHz: 220,
  system: { kind: 'rational', maxDenominator: 64 },
  octaveFold: true,
}

const temperedContext: TuningContextSpec = {
  ...rationalContext,
  id: 'tuning-12tet',
  name: '12-TET',
  system: { kind: 'equal-temperament', divisions: 12 },
}

describe('ratio arithmetic', () => {
  it('reduces, folds, and measures intervals', () => {
    expect(reduceRatio(6, 4)).toEqual({ numerator: 3, denominator: 2 })
    expect(reduceRatio(10, 8)).toEqual({ numerator: 5, denominator: 4 })

    // Folding keeps the interval class while landing inside one octave.
    expect(octaveFoldRatio({ numerator: 3, denominator: 1 })).toEqual({
      numerator: 3,
      denominator: 2,
    })
    expect(octaveFoldRatio({ numerator: 1, denominator: 3 })).toEqual({
      numerator: 4,
      denominator: 3,
    })

    // Just intervals, in cents.
    expect(ratioToCents({ numerator: 3, denominator: 2 })).toBeCloseTo(701.955, 3)
    expect(ratioToCents({ numerator: 5, denominator: 4 })).toBeCloseTo(386.314, 3)
    expect(ratioToCents({ numerator: 2, denominator: 1 })).toBeCloseTo(1200, 9)
  })

  it('rejects degenerate ratios rather than producing nonsense', () => {
    expect(() => reduceRatio(1, 0)).toThrow(/divide by zero/)
    expect(() => reduceRatio(Number.NaN, 2)).toThrow(/finite/)
    expect(() => octaveFoldRatio({ numerator: -3, denominator: 2 })).toThrow(
      /positive/,
    )
  })

  it('approximates an arbitrary value as a bounded rational', () => {
    const temperedFifth = 2 ** (7 / 12)

    // Under a tight bound the best convergent really is 3:2, which is why the
    // tempered fifth sounds like a fifth despite not being one.
    const coarse = rationalApproximation(temperedFifth, 64)
    expect(coarse.denominator).toBeLessThanOrEqual(64)
    expect(coarse).toEqual({ numerator: 3, denominator: 2 })

    // Loosening the bound must not make the approximation worse.
    const fine = rationalApproximation(temperedFifth, 1_000)
    expect(fine.denominator).toBeLessThanOrEqual(1_000)
    const coarseError = Math.abs(
      coarse.numerator / coarse.denominator - temperedFifth,
    )
    const fineError = Math.abs(fine.numerator / fine.denominator - temperedFifth)
    expect(fineError).toBeLessThanOrEqual(coarseError)
    expect(fineError).toBeLessThan(1e-4)
  })
})

describe('MG-16 acceptance', () => {
  it('turns a Lissajous 3:2 into a fifth and 5:4 into a major third', () => {
    const fifth = ratioFromMotion(lissajous(3, 2).wheels[0].motion)
    const majorThird = ratioFromMotion(lissajous(5, 4).wheels[0].motion)

    expect(fifth.ok).toBe(true)
    expect(majorThird.ok).toBe(true)
    if (!fifth.ok || !majorThird.ok) return

    expect(fifth.ratio).toEqual({ numerator: 3, denominator: 2 })
    expect(majorThird.ratio).toEqual({ numerator: 5, denominator: 4 })
    expect(describeRatio(fifth.ratio).name).toBe('perfect fifth')
    expect(describeRatio(majorThird.ratio).name).toBe('major third')

    // The shape changed too: the ratio is read straight off the motion that
    // draws the curve, so the interval cannot drift away from the geometry.
    expect(lissajous(3, 2).wheels[0].motion).not.toEqual(
      lissajous(5, 4).wheels[0].motion,
    )

    // And they are genuinely different pitches.
    const a = frequencyForRatio(rationalContext, fifth.ratio)
    const b = frequencyForRatio(rationalContext, majorThird.ratio)
    expect(a).toBeCloseTo(330, 6)
    expect(b).toBeCloseTo(275, 6)
  })

  it('reports a diagnostic for ratio sources that have no interval', () => {
    const composition = structuredClone(defaultComposition) as Composition
    // The default Wheel is a spirogram: radii are not a frequency ratio.
    const spirogram = ratioFromMotion(composition.wheels[0].motion)
    expect(spirogram.ok).toBe(false)
    if (spirogram.ok) return
    expect(spirogram.reason).toMatch(/not a frequency ratio/)

    for (const motion of [
      { kind: 'superformula' as const, symmetry: 6, n1: 0.3, n2: 0.3, n3: 0.3 },
      {
        kind: 'harmonograph' as const,
        frequencyX: 3,
        frequencyY: 2,
        delta: 0,
        damping: 0.02,
        amplitudeX: 1,
        amplitudeY: 1,
      },
    ]) {
      const result = ratioFromMotion(motion)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toMatch(/no frequency ratio|explicit/)
    }

    // A dangling Wheel reference also reports rather than falling back.
    const dangling = resolveRatioSource(composition, {
      kind: 'wheel-motion',
      wheelId: 'wheel-missing',
    })
    expect(dangling.ok).toBe(false)
    if (!dangling.ok) expect(dangling.reason).toMatch(/unknown Wheel/)
  })

  it('lets two Parts in one context agree on root and interpretation', () => {
    const ratio = { numerator: 3, denominator: 2 }

    // Same context, same answer, regardless of which Part asks.
    expect(frequencyForRatio(rationalContext, ratio)).toBe(
      frequencyForRatio(rationalContext, ratio),
    )
    // A rational context keeps the exact interval.
    expect(frequencyForRatio(rationalContext, ratio)).toBeCloseTo(330, 9)
    // A tempered context snaps to its grid, which is audibly close but not equal.
    const tempered = frequencyForRatio(temperedContext, ratio)
    expect(tempered).toBeCloseTo(220 * 2 ** (7 / 12), 9)
    expect(tempered).not.toBeCloseTo(330, 6)

    // Two Parts using different roots would not agree; that is what a shared
    // context prevents.
    const otherRoot = { ...rationalContext, rootFrequencyHz: 261.6255653 }
    expect(frequencyForRatio(otherRoot, ratio)).not.toBeCloseTo(330, 3)
  })

  /*
   * The degree is a running sum, so an unanchored walk turned a periodic Wheel
   * into a line that never repeated: the steps recurred every cycle but the
   * degree they were applied to had drifted. Segment keys restart it.
   */
  it('repeats a repeating source once the walk is anchored', () => {
    const spec = {
      maxStep: 2,
      directionBias: 0.7,
      lowDegree: 0,
      highDegree: 12,
      startDegree: 4,
    }
    // Three identical passes of one cycle, the shape a periodic Wheel gives.
    const cycle = [0.2, 0.9, 0.5, 0.1, 0.7]
    const values = [...cycle, ...cycle, ...cycle]
    const bars = values.map((_unused, index) => Math.floor(index / cycle.length))

    const drifting = buildMelodicContour(values, spec, 'pentatonic-minor', 60)
    const anchored = buildMelodicContour(
      values,
      spec,
      'pentatonic-minor',
      60,
      bars,
    )

    const notesIn = (line: ReadonlyArray<{ midiNote: number }>, pass: number) =>
      line
        .slice(pass * cycle.length, (pass + 1) * cycle.length)
        .map((step) => step.midiNote)

    // Anchored: every pass is the same phrase, and each begins on the start
    // degree.
    expect(notesIn(anchored, 1)).toEqual(notesIn(anchored, 0))
    expect(notesIn(anchored, 2)).toEqual(notesIn(anchored, 0))
    expect(anchored[0].midiNote).toBe(anchored[cycle.length].midiNote)

    // Unanchored: the same input does not give the same phrase back. This is
    // the behaviour, not a bug in the test — it is what `anchor: 'none'` asks
    // for, and what made the mapping feel random.
    expect(notesIn(drifting, 1)).not.toEqual(notesIn(drifting, 0))
  })

  it('builds a stable rising line rather than independent samples', () => {
    const rising = normalizeSeries([0, 1, 2, 3, 4, 5, 6, 7])
    const line = buildMelodicContour(
      rising,
      {
        maxStep: 2,
        directionBias: 1,
        lowDegree: 0,
        highDegree: 14,
        startDegree: 0,
      },
      'major',
      60,
    )

    expect(line).toHaveLength(rising.length)
    // Monotonically rising source produces a monotonically rising line.
    for (let index = 1; index < line.length; index += 1) {
      expect(line[index].midiNote).toBeGreaterThan(line[index - 1].midiNote)
      expect(line[index].direction).toBe(1)
    }

    // A falling source falls.
    const falling = buildMelodicContour(
      normalizeSeries([7, 6, 5, 4, 3, 2, 1, 0]),
      { maxStep: 2, directionBias: 1, lowDegree: 0, highDegree: 14, startDegree: 14 },
      'major',
      60,
    )
    for (let index = 1; index < falling.length; index += 1) {
      expect(falling[index].midiNote).toBeLessThan(falling[index - 1].midiNote)
    }

    // Deterministic.
    expect(
      buildMelodicContour(
        rising,
        { maxStep: 2, directionBias: 1, lowDegree: 0, highDegree: 14, startDegree: 0 },
        'major',
        60,
      ),
    ).toEqual(line)
  })

  it('turns the line around at its range edge instead of repeating a note', () => {
    const line = buildMelodicContour(
      normalizeSeries([0, 1, 2, 3, 4, 5, 6, 7, 8]),
      { maxStep: 3, directionBias: 1, lowDegree: 0, highDegree: 4, startDegree: 3 },
      'pentatonic-major',
      60,
    )

    // Every degree stays inside the declared range.
    for (const step of line) {
      expect(step.degree).toBeGreaterThanOrEqual(0)
      expect(step.degree).toBeLessThanOrEqual(4)
    }
    // And the line does not flatten into one repeated note at the ceiling.
    expect(new Set(line.map((step) => step.midiNote)).size).toBeGreaterThan(1)
  })
})
