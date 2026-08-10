import type { Composition } from '../core/composition'
import {
  buildCompositionDrawCommands,
  buildCompositionScene,
  fitSpaceProjection,
  sceneSpacePoints,
  type CompositionDrawCommand,
  type ObservationInterval,
} from '../render/compositionRenderer'

const size = 1024
const padding = 48

export const exportCompositionToSvg = (
  composition: Composition,
  observation: ObservationInterval,
) => {
  const scene = buildCompositionScene(
    composition,
    observation.endSeconds,
    observation,
    { traceMode: 'full' },
  )
  const projection = fitSpaceProjection(
    composition.space,
    sceneSpacePoints(scene),
    { width: size, height: size, padding },
  )
  const commands = buildCompositionDrawCommands(scene, projection, {
    showBoundaryLabels: true,
    showHeads: true,
    showTraces: true,
    headRadiusPixels: 6,
  })

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">',
    `  <title>${escapeXml(composition.name)}</title>`,
    ...commands.map(svgForCommand),
    '</svg>',
  ].join('\n')
}

export const downloadCompositionSvg = (
  composition: Composition,
  observation: ObservationInterval,
) => {
  const blob = new Blob([exportCompositionToSvg(composition, observation)], {
    type: 'image/svg+xml',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileStem(composition.name)}.svg`
  anchor.click()
  URL.revokeObjectURL(url)
}

const svgForCommand = (command: CompositionDrawCommand): string => {
  switch (command.kind) {
    case 'clear':
      return `  <rect width="${round(command.width)}" height="${round(command.height)}" fill="${escapeXml(command.color)}"/>`
    case 'ring-boundary':
      return `  <circle data-boundary-id="${escapeXml(command.boundaryId)}" cx="${round(command.center.x)}" cy="${round(command.center.y)}" r="${round(command.radius)}" fill="none" stroke="${escapeXml(command.color)}" stroke-width="${round(command.lineWidth)}"/>`
    case 'spoke-boundary':
      return `  <line data-boundary-id="${escapeXml(command.boundaryId)}" x1="${round(command.from.x)}" y1="${round(command.from.y)}" x2="${round(command.to.x)}" y2="${round(command.to.y)}" stroke="${escapeXml(command.color)}" stroke-width="${round(command.lineWidth)}"/>`
    case 'wedge-boundary':
      return `  <polygon data-boundary-id="${escapeXml(command.boundaryId)}" points="${round(command.center.x)},${round(command.center.y)} ${round(command.left.x)},${round(command.left.y)} ${round(command.right.x)},${round(command.right.y)}" fill="${escapeXml(command.color)}" fill-opacity="${round(command.fillOpacity)}" stroke="${escapeXml(command.color)}" stroke-width="${round(command.lineWidth)}"/>`
    case 'trace':
      return `  <polyline data-head-id="${escapeXml(command.headId)}" points="${command.points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')}" fill="none" stroke="${escapeXml(command.color)}" stroke-width="${round(command.lineWidth)}" opacity="${round(command.opacity)}" stroke-linecap="round" stroke-linejoin="round"/>`
    case 'head':
      return `  <circle data-head-id="${escapeXml(command.headId)}" cx="${round(command.position.x)}" cy="${round(command.position.y)}" r="${round(command.radius)}" fill="${escapeXml(command.color)}" opacity="${round(command.opacity)}"/>`
    case 'ellipse-boundary':
      return `  <ellipse data-boundary-id="${escapeXml(command.boundaryId)}" cx="${round(command.center.x)}" cy="${round(command.center.y)}" rx="${round(command.radiusX)}" ry="${round(command.radiusY)}" transform="rotate(${round((command.rotation * 180) / Math.PI)} ${round(command.center.x)} ${round(command.center.y)})" fill="none" stroke="${escapeXml(command.color)}" stroke-width="${round(command.lineWidth)}"/>`
    case 'polyline-boundary':
      return `  <polyline data-boundary-id="${escapeXml(command.boundaryId)}" points="${command.points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')}" fill="none" stroke="${escapeXml(command.color)}" stroke-width="${round(command.lineWidth)}"/>`
    case 'boundary-label':
    case 'label':
      return `  <text x="${round(command.position.x)}" y="${round(command.position.y)}" fill="${escapeXml(command.color)}">${escapeXml(command.text)}</text>`
  }
}

const round = (value: number) => Number(value.toFixed(2))

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const fileStem = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'spirophonic'
