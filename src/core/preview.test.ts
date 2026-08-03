import { describe, expect, it } from 'vitest'

import { defaultModel } from './defaultModel'
import { previewPlan } from './preview'
import { renderVoices } from './voices'

const allOn = {
  ...defaultModel,
  voices: defaultModel.voices.map((voice) => ({ ...voice, enabled: true })),
}

describe('previewPlan', () => {
  it('reads the cycle rate as the bar length', () => {
    expect(previewPlan(defaultModel).barSeconds).toBeCloseTo(5, 9)
    expect(
      previewPlan({ ...defaultModel, time: { ...defaultModel.time, cyclesPerSecond: 0.5 } })
        .barSeconds,
    ).toBeCloseTo(2, 9)
  })

  it('clamps the cycle rate the way playback does', () => {
    expect(
      previewPlan({ ...defaultModel, time: { ...defaultModel.time, cyclesPerSecond: 0 } })
        .barSeconds,
    ).toBeCloseTo(100, 9)
  })

  it('plays exactly the notes the model rendered', () => {
    const rendered = renderVoices(allOn).reduce(
      (count, item) => count + item.notes.length,
      0,
    )

    expect(previewPlan(allOn).hits).toHaveLength(rendered)
  })

  it('keeps every hit inside the bar', () => {
    const { barSeconds, hits } = previewPlan(allOn)

    for (const hit of hits) {
      expect(hit.offset).toBeGreaterThanOrEqual(0)
      expect(hit.offset).toBeLessThan(barSeconds)
    }
  })

  it('orders hits by when they sound', () => {
    const offsets = previewPlan(allOn).hits.map((hit) => hit.offset)

    expect(offsets).toEqual([...offsets].sort((left, right) => left - right))
  })

  it('carries velocity through as a level', () => {
    for (const hit of previewPlan(allOn).hits) {
      expect(hit.level).toBeGreaterThan(0)
      expect(hit.level).toBeLessThanOrEqual(1)
    }
  })

  it('holds a note for the same share of the bar the MIDI file writes', () => {
    const { barSeconds, hits } = previewPlan(allOn)
    const pad = hits.filter((hit) => hit.voiceId === 'pad-harmonograph')

    // Gate 1 on a sixteenth grid is a sixteenth of the bar, at most.
    for (const hit of pad) {
      expect(hit.duration).toBeGreaterThan(0)
      expect(hit.duration).toBeLessThanOrEqual(barSeconds / 16 + 1e-9)
    }
  })

  it('lengthens a held voice', () => {
    const sustained = {
      ...allOn,
      voices: allOn.voices.map((voice) => ({ ...voice, gate: 4 })),
    }
    const before = previewPlan(allOn).hits[0].duration
    const after = previewPlan(sustained).hits[0].duration

    expect(after).toBeCloseTo(before * 4, 9)
  })

  it('goes quiet with nothing enabled', () => {
    const silent = {
      ...defaultModel,
      voices: defaultModel.voices.map((voice) => ({ ...voice, enabled: false })),
    }

    expect(previewPlan(silent).hits).toEqual([])
  })

  it('produces identical output for identical input', () => {
    expect(previewPlan(allOn)).toEqual(previewPlan(allOn))
  })
})
