import type { CurveEvent } from './events'
import { wrapCycle } from './events'

export type QuantizeOptions = {
  divisions: number
  strength: number
}

export type VelocityOptions = {
  min: number
  max: number
  gamma: number
}

export type ShapedEvent = CurveEvent & {
  velocity: number
}

export const defaultQuantizeOptions: QuantizeOptions = {
  divisions: 16,
  strength: 0,
}

export const defaultVelocityOptions: VelocityOptions = {
  min: 48,
  max: 118,
  gamma: 1,
}

/**
 * Pulls onsets toward a grid instead of snapping them onto it, so a curve can
 * keep its own gait at low strength and lock to the bar at full strength.
 */
export const quantizeEvents = (
  events: Array<CurveEvent>,
  options: QuantizeOptions,
): Array<CurveEvent> => {
  const divisions = Math.max(1, Math.round(options.divisions))
  const strength = clampUnit(options.strength)
  const moved = events.map((event) => {
    const snapped = Math.round(event.t * divisions) / divisions

    return { ...event, t: wrapCycle(event.t + (snapped - event.t) * strength) }
  })

  return collapse(moved)
}

export const applyVelocity = (
  events: Array<CurveEvent>,
  options: VelocityOptions,
): Array<ShapedEvent> => {
  const low = clampVelocity(Math.min(options.min, options.max))
  const high = clampVelocity(Math.max(options.min, options.max))
  const gamma = options.gamma > 0 ? options.gamma : 1

  return events.map((event) => ({
    ...event,
    velocity: clampVelocity(
      Math.round(low + (high - low) * clampUnit(event.strength) ** gamma),
    ),
  }))
}

export const shapeRhythm = (
  events: Array<CurveEvent>,
  options: { quantize: QuantizeOptions; velocity: VelocityOptions },
): Array<ShapedEvent> =>
  applyVelocity(quantizeEvents(events, options.quantize), options.velocity)

/**
 * Two onsets that resolve to the same instant are one hit, so the louder wins.
 * At full strength this is what merges a grid slot; below it, only genuinely
 * coincident onsets merge and a near-miss stays as a flam.
 */
const collapse = (events: Array<CurveEvent>): Array<CurveEvent> => {
  const strongestAt = new Map<number, CurveEvent>()

  for (const event of events) {
    const key = Math.round(event.t * 1e9)
    const held = strongestAt.get(key)

    if (!held || event.strength > held.strength) {
      strongestAt.set(key, event)
    }
  }

  return [...strongestAt.values()].sort((left, right) => left.t - right.t)
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

const clampVelocity = (value: number) => Math.min(127, Math.max(1, Math.round(value)))
