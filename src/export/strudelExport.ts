import type { SpirophonicModel } from '../core/model'
import { pointToFrequency } from '../core/mapping'
import type { SpiroPoint } from '../core/spirograph'
import { getEffectiveCyclesPerSecond } from '../core/time'

export const exportStrudelSnippet = (
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
) => {
  const frequencies = sampleFrequencies(model, points)
  const cps = Number(
    getEffectiveCyclesPerSecond(model.time.cyclesPerSecond).toFixed(3),
  )

  return [
    `setcps(${cps})`,
    '',
    `s("${model.sound.waveform}")`,
    `  .freq("<${frequencies.join(' ')}>")`,
    '  .gain(0.45)',
  ].join('\n')
}

const sampleFrequencies = (
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
) => {
  const count = Math.min(8, points.length)

  return Array.from({ length: count }, (_, index) => {
    const pointIndex = Math.floor((index / count) * points.length)
    const point = points[Math.min(pointIndex, points.length - 1)]

    return Math.round(pointToFrequency(point, model, points))
  })
}
