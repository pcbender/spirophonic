import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { exportCompositionToSvg } from './svgExport'

describe('Composition SVG export', () => {
  it('exports radial waveform geometry through the shared scene plan', () => {
    const wave = structuredClone(defaultComposition) as Composition
    wave.fields = []
    wave.wheels[0].motion = {
      kind: 'wave',
      waveform: 'triangle',
      amplitude: 40,
      periodicity: 5,
    }
    wave.wheels[0].heads[0].attachment = {
      kind: 'wave',
      baseRadius: 140,
    }
    const circle = structuredClone(wave)
    if (circle.wheels[0].motion.kind === 'wave') {
      circle.wheels[0].motion.amplitude = 0
    }
    const observation = {
      startSeconds: 0,
      endSeconds: 2,
      sampleRateHz: 120,
    }
    const waveSvg = exportCompositionToSvg(wave, observation)

    expect(waveSvg).toBe(exportCompositionToSvg(wave, observation))
    expect(waveSvg).toContain('data-head-id="head-1"')
    expect(waveSvg).not.toBe(exportCompositionToSvg(circle, observation))
  })

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

  it('exports a wedge Spoke as a filled two-edge polygon', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const spokeField = composition.fields.find((field) => field.kind === 'spokes')
    if (!spokeField || spokeField.kind !== 'spokes') throw new Error('missing spokes')
    spokeField.boundaries[0].angularWidth = Math.PI / 6

    const svg = exportCompositionToSvg(composition, {
      startSeconds: 0,
      endSeconds: 1,
      sampleRateHz: 60,
    })

    expect(svg).toContain('<polygon data-boundary-id="spoke-east"')
    expect(svg).toContain('fill-opacity="0.22"')
  })
})
