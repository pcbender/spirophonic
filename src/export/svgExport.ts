import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/spirograph'

const size = 1024
const padding = 48

export const exportTraceToSvg = (
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
) => {
  const transformed = transformPoints(points)
  const path = transformed
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">',
    `  <title>${escapeXml(model.name)}</title>`,
    '  <rect width="1024" height="1024" fill="#101014"/>',
    `  <path d="${path}" fill="none" stroke="hsl(194 96% 63%)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
  ].join('\n')
}

export const downloadTraceSvg = (
  model: SpirophonicModel,
  points: Array<SpiroPoint>,
) => {
  const blob = new Blob([exportTraceToSvg(model, points)], {
    type: 'image/svg+xml',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`
  anchor.click()
  URL.revokeObjectURL(url)
}

const transformPoints = (points: Array<SpiroPoint>) => {
  const bounds = points.reduce(
    (currentBounds, point) => ({
      minX: Math.min(currentBounds.minX, point.x),
      maxX: Math.max(currentBounds.maxX, point.x),
      minY: Math.min(currentBounds.minY, point.y),
      maxY: Math.max(currentBounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )
  const traceWidth = Math.max(1, bounds.maxX - bounds.minX)
  const traceHeight = Math.max(1, bounds.maxY - bounds.minY)
  const scale = Math.min(
    (size - padding * 2) / traceWidth,
    (size - padding * 2) / traceHeight,
  )
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return points.map((point) => ({
    x: round((point.x - centerX) * scale + size / 2),
    y: round((point.y - centerY) * scale * -1 + size / 2),
  }))
}

const round = (value: number) => Number(value.toFixed(2))

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

