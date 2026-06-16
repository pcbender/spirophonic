import { describe, expect, it } from 'vitest'
import { defaultModel } from '../core/defaultModel'
import { generateSpiroPoints } from '../core/spirograph'
import { exportTraceToSvg } from './svgExport'

describe('SVG export', () => {
  it('exports an SVG path for the trace', () => {
    const svg = exportTraceToSvg(defaultModel, generateSpiroPoints(defaultModel))

    expect(svg).toContain('<svg')
    expect(svg).toContain('<path d="M')
    expect(svg).toContain(defaultModel.name)
  })
})

