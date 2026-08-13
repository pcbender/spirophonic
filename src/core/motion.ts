import type {
  HeadAttachmentSpec,
  MotionSpec,
  Point2,
} from './composition'
import {
  harmonographPointAtTheta,
  lissajousPointAtTheta,
  radialWavePointAtTurn,
  rosePointAtTheta,
  superformulaPointAtTheta,
} from './curves'
import {
  epitrochoidPointAtTheta,
  hypotrochoidPointAtTheta,
} from './trochoid'

const TAU = Math.PI * 2

export type MotionEvaluation = {
  cyclePosition: number
  elapsedCycles: number
  position: Point2
}

const point = ([x, y]: [number, number]): Point2 => ({ x, y })

const assertMatchingFamily = (
  motion: MotionSpec,
  attachment: HeadAttachmentSpec,
) => {
  if (motion.kind !== attachment.kind) {
    throw new RangeError(
      `Head attachment kind "${attachment.kind}" does not match motion kind "${motion.kind}".`,
    )
  }
}

/**
 * Evaluates one Head attachment against shared Wheel motion. Wheel and Head
 * phase offsets are measured in turns; family-internal phase values remain in
 * radians. elapsedCycles is separate so damped motion can decay without being
 * reset when normalized Wheel phase wraps.
 */
export const motionPointAt = (
  motion: MotionSpec,
  attachment: HeadAttachmentSpec,
  cyclePosition: number,
  elapsedCycles: number,
): MotionEvaluation => {
  assertMatchingFamily(motion, attachment)

  if (!Number.isFinite(cyclePosition) || !Number.isFinite(elapsedCycles)) {
    throw new RangeError('Motion cycle positions must be finite numbers.')
  }

  const theta = cyclePosition * TAU

  if (motion.kind === 'spirogram' && attachment.kind === 'spirogram') {
    const evaluator =
      motion.rotation === 'inside'
        ? hypotrochoidPointAtTheta
        : epitrochoidPointAtTheta

    return {
      cyclePosition,
      elapsedCycles,
      position: evaluator(
        theta,
        motion.fixedRadius,
        motion.movingRadius,
        attachment.penOffset,
      ),
    }
  }

  if (motion.kind === 'lissajous' && attachment.kind === 'lissajous') {
    const [x, y] = lissajousPointAtTheta(
      theta,
      motion.frequencyX,
      motion.frequencyY,
      motion.delta + attachment.phaseX,
      attachment.phaseY,
    )

    return {
      cyclePosition,
      elapsedCycles,
      position: {
        x: x * attachment.scaleX,
        y: y * attachment.scaleY,
      },
    }
  }

  if (motion.kind === 'rose' && attachment.kind === 'rose') {
    const position = point(
      rosePointAtTheta(
        theta + attachment.angularOffset,
        motion.numerator / motion.denominator,
      ),
    )

    return {
      cyclePosition,
      elapsedCycles,
      position: {
        x: position.x * attachment.radiusScale,
        y: position.y * attachment.radiusScale,
      },
    }
  }

  if (motion.kind === 'superformula' && attachment.kind === 'superformula') {
    const position = point(
      superformulaPointAtTheta(
        theta + attachment.angularOffset,
        motion.symmetry,
        motion.n1,
        motion.n2,
        motion.n3,
      ),
    )

    return {
      cyclePosition,
      elapsedCycles,
      position: {
        x: position.x * attachment.radiusScale,
        y: position.y * attachment.radiusScale,
      },
    }
  }

  if (motion.kind === 'harmonograph' && attachment.kind === 'harmonograph') {
    return {
      cyclePosition,
      elapsedCycles,
      position: point(
        harmonographPointAtTheta({
          theta,
          frequencyX: motion.frequencyX,
          frequencyY: motion.frequencyY,
          delta: motion.delta,
          damping: motion.damping,
          amplitudeX: motion.amplitudeX * attachment.amplitudeScale,
          amplitudeY: motion.amplitudeY * attachment.amplitudeScale,
          phaseX: attachment.phaseX,
          phaseY: attachment.phaseY,
          decayTheta: Math.max(0, elapsedCycles) * TAU,
        }),
      ),
    }
  }

  if (motion.kind === 'wave' && attachment.kind === 'wave') {
    return {
      cyclePosition,
      elapsedCycles,
      position: point(
        radialWavePointAtTurn(
          cyclePosition,
          motion.waveform,
          motion.amplitude,
          motion.periodicity,
          attachment.baseRadius,
        ),
      ),
    }
  }

  throw new RangeError('Unsupported motion and Head attachment combination.')
}
