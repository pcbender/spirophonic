import type {
  Composition,
  MotionSpec,
  RatioSourceSpec,
  TuningContextSpec,
} from './composition'

export type Ratio = Readonly<{ numerator: number; denominator: number }>

export type RatioResolution =
  | Readonly<{ ok: true; ratio: Ratio; source: string }>
  | Readonly<{ ok: false; reason: string }>

export const defaultTuningContext: TuningContextSpec = Object.freeze({
  id: 'tuning-default',
  name: 'Default',
  rootFrequencyHz: 261.625_565_300_598_6, // C4
  system: { kind: 'equal-temperament' as const, divisions: 12 },
  octaveFold: true,
})

const greatestCommonDivisor = (a: number, b: number): number => {
  let left = Math.abs(Math.round(a))
  let right = Math.abs(Math.round(b))
  while (right > 0) {
    const next = left % right
    left = right
    right = next
  }
  return left || 1
}

/** Lowest terms, with sign normalized onto the numerator. */
export const reduceRatio = (numerator: number, denominator: number): Ratio => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new RangeError('A ratio needs finite terms.')
  }
  if (denominator === 0) throw new RangeError('A ratio cannot divide by zero.')

  const sign = denominator < 0 ? -1 : 1
  const divisor = greatestCommonDivisor(numerator, denominator)
  return Object.freeze({
    numerator: (sign * Math.round(numerator)) / divisor,
    denominator: (sign * Math.round(denominator)) / divisor,
  })
}

/** Folds a ratio into a single octave, [1, 2). */
export const octaveFoldRatio = (ratio: Ratio): Ratio => {
  if (ratio.numerator <= 0 || ratio.denominator <= 0) {
    throw new RangeError('Only a positive ratio can be octave folded.')
  }

  let { numerator, denominator } = ratio
  // Scale the smaller term rather than dividing, so the result stays rational.
  while (numerator >= denominator * 2) denominator *= 2
  while (numerator < denominator) numerator *= 2
  return reduceRatio(numerator, denominator)
}

export const ratioToCents = (ratio: Ratio) =>
  1200 * Math.log2(ratio.numerator / ratio.denominator)

export const centsToRatioValue = (cents: number) => 2 ** (cents / 1200)

/**
 * Reads a musical ratio out of a Wheel's motion.
 *
 * Lissajous and rose carry an explicit frequency relationship, which is exactly
 * what a musical interval is, so 3:2 is a perfect fifth and 5:4 a major third.
 * Spirogram radii, superformula exponents, and harmonograph damping are not
 * frequency relationships; deriving an interval from them would be inventing a
 * scale, so they report why instead.
 */
export const ratioFromMotion = (motion: MotionSpec): RatioResolution => {
  if (motion.kind === 'lissajous') {
    if (motion.frequencyX <= 0 || motion.frequencyY <= 0) {
      return Object.freeze({
        ok: false as const,
        reason: 'Lissajous frequencies must be positive to form a ratio.',
      })
    }
    return Object.freeze({
      ok: true as const,
      ratio: reduceRatio(motion.frequencyX, motion.frequencyY),
      source: 'lissajous frequencyX:frequencyY',
    })
  }

  if (motion.kind === 'rose') {
    if (motion.numerator <= 0 || motion.denominator <= 0) {
      return Object.freeze({
        ok: false as const,
        reason: 'Rose numerator and denominator must be positive to form a ratio.',
      })
    }
    return Object.freeze({
      ok: true as const,
      ratio: reduceRatio(motion.numerator, motion.denominator),
      source: 'rose numerator:denominator',
    })
  }

  if (motion.kind === 'spirogram') {
    return Object.freeze({
      ok: false as const,
      reason:
        'Spirogram radii describe a rolling relationship, not a frequency ratio. Use an explicit ratio, or a Lissajous or rose Wheel.',
    })
  }

  return Object.freeze({
    ok: false as const,
    reason: `${motion.kind} motion has no frequency ratio to interpret. Use an explicit ratio instead.`,
  })
}

export const resolveRatioSource = (
  composition: Composition,
  source: RatioSourceSpec,
): RatioResolution => {
  if (source.kind === 'explicit') {
    if (source.numerator <= 0 || source.denominator <= 0) {
      return Object.freeze({
        ok: false as const,
        reason: 'An explicit ratio needs positive terms.',
      })
    }
    return Object.freeze({
      ok: true as const,
      ratio: reduceRatio(source.numerator, source.denominator),
      source: 'explicit',
    })
  }

  const wheel = composition.wheels.find(
    (candidate) => candidate.id === source.wheelId,
  )
  if (!wheel) {
    return Object.freeze({
      ok: false as const,
      reason: `Ratio references unknown Wheel "${source.wheelId}".`,
    })
  }
  return ratioFromMotion(wheel.motion)
}

export const findTuningContext = (
  composition: Composition,
  id: string | undefined,
): TuningContextSpec => {
  if (!id) return defaultTuningContext
  return (
    composition.tuningContexts?.find((context) => context.id === id) ??
    defaultTuningContext
  )
}

/**
 * Applies a ratio to a context's root. An equal-tempered context snaps the
 * result to its nearest division, which is what makes two Parts sharing a
 * context agree; a rational context keeps the exact frequency, which is the
 * case MIDI cannot represent without pitch bend.
 */
export const frequencyForRatio = (
  context: TuningContextSpec,
  ratio: Ratio,
): number => {
  const folded = context.octaveFold ? octaveFoldRatio(ratio) : ratio
  const exact = context.rootFrequencyHz * (folded.numerator / folded.denominator)

  if (context.system.kind === 'rational') return exact

  const divisions = context.system.divisions
  const steps = Math.round(divisions * Math.log2(exact / context.rootFrequencyHz))
  return context.rootFrequencyHz * 2 ** (steps / divisions)
}

/**
 * Approximates an arbitrary frequency ratio by a rational one no worse than
 * `maxDenominator`, using continued fractions. Used to report what a rational
 * context actually played.
 */
export const rationalApproximation = (
  value: number,
  maxDenominator: number,
): Ratio => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('Only a positive finite value can be approximated.')
  }

  let lowerNumerator = 0
  let lowerDenominator = 1
  let upperNumerator = 1
  let upperDenominator = 0
  let remaining = value

  for (let step = 0; step < 64; step += 1) {
    const whole = Math.floor(remaining)
    const nextNumerator = whole * upperNumerator + lowerNumerator
    const nextDenominator = whole * upperDenominator + lowerDenominator

    if (nextDenominator > maxDenominator) break

    lowerNumerator = upperNumerator
    lowerDenominator = upperDenominator
    upperNumerator = nextNumerator
    upperDenominator = nextDenominator

    const fraction = remaining - whole
    if (fraction < 1e-12) break
    remaining = 1 / fraction
  }

  return reduceRatio(upperNumerator, Math.max(1, upperDenominator))
}

/** Named intervals, for diagnostics and UI rather than for pitch maths. */
export const describeRatio = (ratio: Ratio) => {
  const folded = octaveFoldRatio(ratio)
  const key = `${folded.numerator}:${folded.denominator}`
  const names: Record<string, string> = {
    '1:1': 'unison',
    '9:8': 'major second',
    '6:5': 'minor third',
    '5:4': 'major third',
    '4:3': 'perfect fourth',
    '3:2': 'perfect fifth',
    '8:5': 'minor sixth',
    '5:3': 'major sixth',
    '16:9': 'minor seventh',
    '15:8': 'major seventh',
  }
  return {
    ratio: folded,
    label: key,
    name: names[key] ?? `${key} (${ratioToCents(folded).toFixed(1)} cents)`,
    cents: ratioToCents(folded),
  }
}
