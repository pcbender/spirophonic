import type {
  Composition,
  HeadSpec,
  Point2,
  WheelSpec,
} from './composition'
import { motionPointAt } from './motion'
import { wrapCyclePhase } from './transport'
import { findWheel, wheelStateAt } from './wheels'

export type HeadState = {
  wheelId: string
  headId: string
  subjectIds: readonly [string, string]
  timeSeconds: number
  wheelPhase: number
  headPhase: number
  position: Point2
  velocity: Point2
  speed: number
  angle: number
  radius: number
}

type LocatedHead = {
  wheel: WheelSpec
  head: HeadSpec
}

const velocityStepSeconds = 1 / 10_000

export const findHead = (
  composition: Composition,
  headId: string,
): LocatedHead => {
  for (const wheel of composition.wheels) {
    const head = wheel.heads.find((candidate) => candidate.id === headId)

    if (head) return { wheel, head }
  }

  throw new RangeError(`Unknown Head "${headId}".`)
}

const positionAt = (
  composition: Composition,
  wheel: WheelSpec,
  head: HeadSpec,
  timeSeconds: number,
) => {
  const wheelState = wheelStateAt(composition, wheel.id, timeSeconds)
  const headCyclePosition = wheelState.cyclePosition + head.phaseOffset
  const motion = motionPointAt(
    wheel.motion,
    head.attachment,
    headCyclePosition,
    wheelState.elapsedCycles,
  )
  const localPosition = {
    x: motion.position.x + head.offset.x,
    y: motion.position.y + head.offset.y,
  }

  return {
    wheelState,
    headPhase: wrapCyclePhase(headCyclePosition),
    localPosition,
    position: {
      x: wheel.center.x + localPosition.x,
      y: wheel.center.y + localPosition.y,
    },
  }
}

export const headStateAt = (
  composition: Composition,
  headId: string,
  timeSeconds: number,
): HeadState => {
  const { wheel, head } = findHead(composition, headId)
  const current = positionAt(composition, wheel, head, timeSeconds)
  let velocity: Point2

  if (timeSeconds < velocityStepSeconds) {
    const oneStep = positionAt(
      composition,
      wheel,
      head,
      timeSeconds + velocityStepSeconds,
    ).position
    const twoSteps = positionAt(
      composition,
      wheel,
      head,
      timeSeconds + 2 * velocityStepSeconds,
    ).position
    const divisor = 2 * velocityStepSeconds

    velocity = {
      x: (-3 * current.position.x + 4 * oneStep.x - twoSteps.x) / divisor,
      y: (-3 * current.position.y + 4 * oneStep.y - twoSteps.y) / divisor,
    }
  } else {
    const before = positionAt(
      composition,
      wheel,
      head,
      timeSeconds - velocityStepSeconds,
    ).position
    const after = positionAt(
      composition,
      wheel,
      head,
      timeSeconds + velocityStepSeconds,
    ).position
    const divisor = 2 * velocityStepSeconds

    velocity = {
      x: (after.x - before.x) / divisor,
      y: (after.y - before.y) / divisor,
    }
  }

  return {
    wheelId: wheel.id,
    headId: head.id,
    subjectIds: [wheel.id, head.id],
    timeSeconds,
    wheelPhase: current.wheelState.phase,
    headPhase: current.headPhase,
    position: current.position,
    velocity,
    speed: Math.hypot(velocity.x, velocity.y),
    angle: Math.atan2(current.localPosition.y, current.localPosition.x),
    radius: Math.hypot(current.localPosition.x, current.localPosition.y),
  }
}

export const headStatesAt = (
  composition: Composition,
  wheelId: string,
  timeSeconds: number,
): Array<HeadState> => {
  const wheel = findWheel(composition, wheelId)

  return wheel.heads.map((head) =>
    headStateAt(composition, head.id, timeSeconds),
  )
}
