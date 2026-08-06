import type { QuantizeSpec, VelocityMapping } from './composition'

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

const clampVelocity = (value: number) =>
  Math.min(127, Math.max(1, Math.round(value)))

/** Pulls an absolute Transport beat toward an absolute beat grid. */
export const quantizeAbsoluteBeat = (
  absoluteBeat: number,
  options: QuantizeSpec,
) => {
  if (!Number.isFinite(absoluteBeat)) {
    throw new RangeError('absoluteBeat must be finite.')
  }
  if (!Number.isFinite(options.gridBeats) || options.gridBeats <= 0) {
    throw new RangeError('gridBeats must be finite and positive.')
  }

  const strength = clampUnit(options.strength)
  const snapped =
    Math.round(absoluteBeat / options.gridBeats) * options.gridBeats
  return absoluteBeat + (snapped - absoluteBeat) * strength
}

/** Maps the Encounter strength contract into the MIDI velocity range. */
export const mapStrengthToVelocity = (
  strength: number,
  mapping: VelocityMapping,
) => {
  if (mapping.kind === 'constant') return clampVelocity(mapping.value)

  const low = clampVelocity(Math.min(mapping.min, mapping.max))
  const high = clampVelocity(Math.max(mapping.min, mapping.max))
  const gamma = mapping.gamma > 0 ? mapping.gamma : 1

  return clampVelocity(
    Math.round(low + (high - low) * clampUnit(strength) ** gamma),
  )
}
