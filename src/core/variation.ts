import type {
  Composition,
  VariationLayerSpec,
  VariationSpec,
} from './composition'
import { randomVersion, signedUnitValue, unitValue } from './random'

/**
 * Maximum delta each rule may apply at amount 1. These are engine behaviour,
 * not saved data, so they are documented here and versioned with the engine.
 */
export const variationBounds = Object.freeze({
  /** Wheel and Head phase, in turns. */
  phaseTurns: 0.05,
  /** Field rotation, in radians. */
  fieldRotationRadians: Math.PI / 12,
  /** Performed onset, in beats. */
  timingBeats: 0.08,
  /** Performed velocity, in MIDI units. */
  velocity: 24,
  /** Performed duration, as a fraction of the interpreted duration. */
  durationFraction: 0.35,
  /** Interpretation pitch choice, in scale degrees. */
  pitchDegrees: 2,
})

export type VariationRule =
  | 'wheel-phase'
  | 'head-phase'
  | 'field-rotation'
  | 'pitch-choice'
  | 'probability'
  | 'timing'
  | 'velocity'
  | 'duration'

/** Why one output value differs from its unvaried counterpart. */
export type VariationTraceEntry = Readonly<{
  rule: VariationRule
  targetId: string
  field: string
  scope: string
  baseValue: number
  appliedValue: number
  delta: number
}>

export const disabledLayer: VariationLayerSpec = Object.freeze({
  enabled: false,
  amount: 0,
})

export const layerOf = (
  variation: VariationSpec | undefined,
  layer: 'initialConditions' | 'interpretation' | 'performance',
): VariationLayerSpec => {
  if (!variation?.enabled) return disabledLayer
  const spec = variation[layer]
  if (!spec?.enabled) return disabledLayer
  return spec
}

export const variationIsActive = (variation: VariationSpec | undefined) =>
  layerOf(variation, 'initialConditions').enabled ||
  layerOf(variation, 'interpretation').enabled ||
  layerOf(variation, 'performance').enabled

const clampAmount = (amount: number) => Math.min(1, Math.max(0, amount))

/** A bounded symmetric delta for one scoped value. */
export const boundedDelta = (
  seed: string,
  bound: number,
  layer: VariationLayerSpec,
  ...scope: ReadonlyArray<string | number>
) => signedUnitValue(seed, ...scope) * bound * clampAmount(layer.amount)

export type VariationResult<T> = Readonly<{
  value: T
  trace: ReadonlyArray<VariationTraceEntry>
}>

const traceEntry = (
  rule: VariationRule,
  targetId: string,
  field: string,
  scope: string,
  baseValue: number,
  appliedValue: number,
): VariationTraceEntry =>
  Object.freeze({
    rule,
    targetId,
    field,
    scope,
    baseValue,
    appliedValue,
    delta: appliedValue - baseValue,
  })

/**
 * Applies initial-condition variation to a copy of the Composition, before any
 * geometry is evaluated. Nothing downstream needs to know variation happened:
 * the compiler still sees a plain Composition, which keeps the geometry code
 * free of variation concerns.
 *
 * Returns the input unchanged when the layer is off, so the disabled path is
 * the unvaried path rather than a re-derivation that happens to match.
 */
export const applyInitialConditionVariation = (
  composition: Composition,
): VariationResult<Composition> => {
  const layer = layerOf(composition.variation, 'initialConditions')
  if (!layer.enabled) {
    return Object.freeze({ value: composition, trace: Object.freeze([]) })
  }

  const seed = composition.variation?.seed ?? ''
  const trace: Array<VariationTraceEntry> = []

  const wheels = composition.wheels.map((wheel) => {
    const wheelScope = `wheel/${wheel.id}/phase`
    const wheelDelta = boundedDelta(
      seed,
      variationBounds.phaseTurns,
      layer,
      wheelScope,
    )
    const nextPhase = wheel.phase + wheelDelta
    trace.push(
      traceEntry('wheel-phase', wheel.id, 'phase', wheelScope, wheel.phase, nextPhase),
    )

    const heads = wheel.heads.map((head) => {
      const headScope = `head/${head.id}/phaseOffset`
      const headDelta = boundedDelta(
        seed,
        variationBounds.phaseTurns,
        layer,
        headScope,
      )
      const nextOffset = head.phaseOffset + headDelta
      trace.push(
        traceEntry(
          'head-phase',
          head.id,
          'phaseOffset',
          headScope,
          head.phaseOffset,
          nextOffset,
        ),
      )
      return { ...head, phaseOffset: nextOffset }
    })

    return { ...wheel, phase: nextPhase, heads }
  })

  const fields = composition.fields.map((field) => {
    const scope = `field/${field.id}/rotation`
    const base = field.rotation ?? 0
    const delta = boundedDelta(
      seed,
      variationBounds.fieldRotationRadians,
      layer,
      scope,
    )
    const next = base + delta
    trace.push(traceEntry('field-rotation', field.id, 'rotation', scope, base, next))
    return { ...field, rotation: next } as Composition['fields'][number]
  })

  return Object.freeze({
    value: { ...composition, wheels, fields },
    trace: Object.freeze(trace),
  })
}

export type InterpretationVariation = Readonly<{
  /** Scale degrees to shift the chosen pitch by. */
  degreeShift: number
  /** Whether the note sounds at all. */
  sounds: boolean
  trace: ReadonlyArray<VariationTraceEntry>
}>

/**
 * Interpretation-layer variation for one candidate note. Scoped by Part and
 * source Encounter, so it is stable no matter what other Parts exist.
 */
export const interpretationVariationFor = (
  variation: VariationSpec | undefined,
  partId: string,
  encounterId: string,
  baseProbability: number,
): InterpretationVariation => {
  const layer = layerOf(variation, 'interpretation')
  if (!layer.enabled) {
    return Object.freeze({
      degreeShift: 0,
      sounds: true,
      trace: Object.freeze([]),
    })
  }

  const seed = variation?.seed ?? ''
  const pitchScope = `part/${partId}/encounter/${encounterId}/pitch`
  const probabilityScope = `part/${partId}/encounter/${encounterId}/probability`
  const degreeShift = Math.round(
    boundedDelta(seed, variationBounds.pitchDegrees, layer, pitchScope),
  )
  // Amount raises how often a note may drop out, up to the layer's bound.
  const dropChance = clampAmount(layer.amount) * (1 - baseProbability + 0.25)
  const roll = unitValue(seed, probabilityScope)
  const sounds = roll >= dropChance

  return Object.freeze({
    degreeShift,
    sounds,
    trace: Object.freeze([
      traceEntry('pitch-choice', partId, 'degree', pitchScope, 0, degreeShift),
      traceEntry(
        'probability',
        partId,
        'sounds',
        probabilityScope,
        1,
        sounds ? 1 : 0,
      ),
    ]),
  })
}

export type PerformanceVariation = Readonly<{
  timingBeats: number
  velocityDelta: number
  durationScale: number
  trace: ReadonlyArray<VariationTraceEntry>
}>

/**
 * Performance-layer variation for one interpreted event. Scoped by the event's
 * own id, so the event keeps its identity and only gains a bounded delta.
 */
export const performanceVariationFor = (
  variation: VariationSpec | undefined,
  eventId: string,
): PerformanceVariation => {
  const layer = layerOf(variation, 'performance')
  if (!layer.enabled) {
    return Object.freeze({
      timingBeats: 0,
      velocityDelta: 0,
      durationScale: 1,
      trace: Object.freeze([]),
    })
  }

  const seed = variation?.seed ?? ''
  const timingScope = `event/${eventId}/timing`
  const velocityScope = `event/${eventId}/velocity`
  const durationScope = `event/${eventId}/duration`
  const timingBeats = boundedDelta(
    seed,
    variationBounds.timingBeats,
    layer,
    timingScope,
  )
  const velocityDelta = boundedDelta(
    seed,
    variationBounds.velocity,
    layer,
    velocityScope,
  )
  const durationScale =
    1 +
    boundedDelta(seed, variationBounds.durationFraction, layer, durationScope)

  return Object.freeze({
    timingBeats,
    velocityDelta,
    durationScale: Math.max(0.05, durationScale),
    trace: Object.freeze([
      traceEntry('timing', eventId, 'absoluteBeat', timingScope, 0, timingBeats),
      traceEntry('velocity', eventId, 'velocity', velocityScope, 0, velocityDelta),
      traceEntry('duration', eventId, 'durationBeats', durationScope, 1, durationScale),
    ]),
  })
}

/** Reports when a Recording's randomness version differs from this engine's. */
export const variationVersionWarning = (recorded: number | undefined) =>
  recorded !== undefined && recorded !== randomVersion
    ? `Variation was produced under randomness version ${recorded}; this engine is version ${randomVersion} and would reroll rather than reproduce it.`
    : null
