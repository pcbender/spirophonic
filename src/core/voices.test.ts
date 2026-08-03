import { describe, expect, it } from 'vitest'

import { defaultModel, defaultVoices } from './defaultModel'
import { renderVoice, renderVoices } from './voices'

const byId = (id: string) => {
  const voice = defaultVoices.find((item) => item.id === id)

  if (!voice) {
    throw new Error(`no voice ${id}`)
  }

  return voice
}

describe('renderVoice', () => {
  it('gives the rose one kick per petal', () => {
    expect(renderVoice(byId('kick-rose'))).toHaveLength(5)
  })

  it('reads three hats and two snares off one lissajous', () => {
    expect(renderVoice(byId('hat-lissajous-x'))).toHaveLength(3)
    expect(renderVoice(byId('snare-lissajous-y'))).toHaveLength(2)
  })

  it('lands the default kit on the grid', () => {
    for (const voice of defaultVoices) {
      for (const event of renderVoice(voice)) {
        expect(event.t * 16).toBeCloseTo(Math.round(event.t * 16), 9)
      }
    }
  })

  it('voices every hit inside the MIDI range', () => {
    for (const voice of defaultVoices) {
      for (const event of renderVoice(voice)) {
        expect(event.velocity).toBeGreaterThanOrEqual(1)
        expect(event.velocity).toBeLessThanOrEqual(127)
      }
    }
  })

  it('produces identical output for identical input', () => {
    expect(renderVoice(byId('kick-rose'))).toEqual(renderVoice(byId('kick-rose')))
  })
})

describe('renderVoices', () => {
  it('renders every enabled voice', () => {
    expect(renderVoices(defaultModel)).toHaveLength(3)
  })

  it('skips a disabled voice', () => {
    const model = {
      ...defaultModel,
      voices: defaultModel.voices.map((voice) =>
        voice.id === 'kick-rose' ? { ...voice, enabled: false } : voice,
      ),
    }

    expect(renderVoices(model).map((item) => item.voice.id)).toEqual([
      'hat-lissajous-x',
      'snare-lissajous-y',
    ])
  })

  it('keeps the kit inside one shared bar', () => {
    for (const { events } of renderVoices(defaultModel)) {
      for (const event of events) {
        expect(event.t).toBeGreaterThanOrEqual(0)
        expect(event.t).toBeLessThan(1)
      }
    }
  })
})
