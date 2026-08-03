import type { CurveEvent } from './events'
import { wrapCycle } from './events'
import type { QuantizeOptions, VelocityOptions } from './model'

export type { QuantizeOptions, VelocityOptions }

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

  return collapse(moved, divisions)
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
 * One grid step holds one hit, and the loudest wins it. This runs at every
 * strength, not only at a full snap, because the grid is the resolution the
 * part is written at: the MIDI writer would otherwise place a dozen onsets a
 * few ticks apart while the Strudel step sequence folded them into three, and
 * the two exports would stop describing the same music.
 *
 * The winner keeps its own timing rather than the slot's, so a loose part
 * still plays off the grid. To keep two close onsets apart, raise divisions.
 */
const collapse = (
  events: Array<CurveEvent>,
  divisions: number,
): Array<CurveEvent> => {
  const strongestAt = new Map<number, CurveEvent>()

  for (const event of events) {
    const key = Math.round(event.t * divisions) % divisions
    const held = strongestAt.get(key)

    if (!held || event.strength > held.strength) {
      strongestAt.set(key, event)
    }
  }

  return [...strongestAt.values()].sort((left, right) => left.t - right.t)
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

const clampVelocity = (value: number) => Math.min(127, Math.max(1, Math.round(value)))

/**
 * How long each onset is held, as a fraction of one bar.
 *
 * Every output needs this and none of them should reinvent it: the MIDI writer
 * multiplies by ticks per bar, the preview by seconds per bar, and Strudel says
 * the same thing with clip(). A note fills its own grid step, scaled by gate.
 *
 * At a gate of 1 or less a note is also held no longer than the gap to the next
 * onset. Loosely quantized onsets can sit closer together than a step, and a
 * full step would run one note into the next and turn a line into a chord.
 * Above 1 the overlap is the point, so it is left alone.
 */
export const noteLengths = (
  events: Array<Pick<CurveEvent, 't'>>,
  options: { steps: number; gate: number },
): Array<number> => {
  const steps = Math.max(1, Math.round(options.steps))
  const gate = options.gate > 0 ? options.gate : 1
  const held = gate / steps

  if (gate > 1 || events.length < 2) {
    return events.map(() => held)
  }

  return events.map((event, index) => {
    const next = events[(index + 1) % events.length]
    const gap = wrapCycle(next.t - event.t)

    return gap === 0 ? held : Math.min(held, gap)
  })
}
