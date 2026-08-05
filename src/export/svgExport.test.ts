import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { exportCompositionToSvg } from './svgExport'

describe('Composition SVG export', () => {
  it('renders the same v1 scene plan deterministically', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const observation = {
      startSeconds: 0,
      endSeconds: 2,
      sampleRateHz: 120,
    }
    const svg = exportCompositionToSvg(composition, observation)

    expect(svg).toBe(exportCompositionToSvg(composition, observation))
    expect(svg).toContain('<title>Simple Ring Crossing</title>')
    expect(svg).toContain('data-head-id="head-1"')
    expect(svg).toContain('data-boundary-id="ring-inner"')
    expect(svg).toContain('data-boundary-id="spoke-east"')
  })
})
