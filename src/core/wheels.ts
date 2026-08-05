import type { Composition, Point2, WheelSpec } from './composition'
import {
  normalizeCycleRate,
  transportAddressAtSeconds,
  wrapCyclePhase,
} from './transport'

export type WheelState = {
  wheelId: string
  subjectIds: readonly [string]
  timeSeconds: number
  absoluteBeat: number
  elapsedCycles: number
  cyclePosition: number
  phase: number
  direction: WheelSpec['direction']
  center: Point2
}

export const findWheel = (composition: Composition, wheelId: string) => {
  const wheel = composition.wheels.find((candidate) => candidate.id === wheelId)

  if (!wheel) {
    throw new RangeError(`Unknown Wheel "${wheelId}".`)
  }

  return wheel
}

export const wheelStateAt = (
  composition: Composition,
  wheelId: string,
  timeSeconds: number,
): WheelState => {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
    throw new RangeError('timeSeconds must be a finite, non-negative number.')
  }

  const wheel = findWheel(composition, wheelId)
  const address = transportAddressAtSeconds(composition.transport, timeSeconds)
  const rate = normalizeCycleRate(wheel.rate)
  const elapsedCycles =
    address.absoluteBeat * (rate.cycles / rate.beats)
  const directionSign = wheel.direction === 'reverse' ? -1 : 1
  const cyclePosition = wheel.phase + directionSign * elapsedCycles

  return {
    wheelId: wheel.id,
    subjectIds: [wheel.id],
    timeSeconds,
    absoluteBeat: address.absoluteBeat,
    elapsedCycles,
    cyclePosition,
    phase: wrapCyclePhase(cyclePosition),
    direction: wheel.direction,
    center: { ...wheel.center },
  }
}

export const wheelStatesAt = (
  composition: Composition,
  timeSeconds: number,
): Array<WheelState> =>
  composition.wheels.map((wheel) =>
    wheelStateAt(composition, wheel.id, timeSeconds),
  )
