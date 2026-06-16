import type { SpirophonicModel } from '../core/model'
import { pointToHue } from '../core/mapping'
import type { SpiroPoint } from '../core/spirograph'

export const pointToHsl = (
  point: SpiroPoint,
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
  index: number,
) => {
  const hue = pointToHue(point, model, points, index)
  const saturation = Math.round(model.color.saturation)
  const lightness = Math.round(model.color.lightness)

  return `hsl(${Math.round(hue)} ${saturation}% ${lightness}%)`
}
