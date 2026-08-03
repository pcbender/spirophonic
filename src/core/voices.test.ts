import { describe, expect, it } from 'vitest'

import { defaultModel, defaultVoices } from './defaultModel'
import { scaleIntervals } from './scales'
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
    expect(renderVoice(byId('kick-rose')).notes).toHaveLength(5)
  })

  it('reads three hats and two snares off one lissajous', () => {
    expect(renderVoice(byId('hat-lissajous-x')).notes).toHaveLength(3)
    expect(renderVoice(byId('snare-lissajous-y')).notes).toHaveLength(2)
  })

  it('lands the default kit on the grid', () => {
    for (const voice of defaultVoices.filter((item) => item.quantize.strength === 1)) {
      for (const event of renderVoice(voice).notes) {
        expect(event.t * 16).toBeCloseTo(Math.round(event.t * 16), 9)
      }
    }
  })

  it('voices every hit inside the MIDI range', () => {
    for (const voice of defaultVoices) {
      for (const event of renderVoice(voice).notes) {
        expect(event.velocity).toBeGreaterThanOrEqual(1)
        expect(event.velocity).toBeLessThanOrEqual(127)
      }
    }
  })

  it('produces identical output for identical input', () => {
    expect(renderVoice(byId('kick-rose')).notes).toEqual(
      renderVoice(byId('kick-rose')).notes,
    )
  })
})

describe('renderVoices', () => {
  it('renders every enabled voice', () => {
    expect(renderVoices(defaultModel)).toHaveLength(3)
  })

  it('leaves a voice that ships disabled out', () => {
    expect(renderVoices(defaultModel).map((item) => item.voice.id)).not.toContain(
      'pad-harmonograph',
    )
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
    for (const { notes } of renderVoices(defaultModel)) {
      for (const event of notes) {
        expect(event.t).toBeGreaterThanOrEqual(0)
        expect(event.t).toBeLessThan(1)
      }
    }
  })
})

describe('pitched voices', () => {
  const pad = () => {
    const voice = defaultVoices.find((item) => item.id === 'pad-harmonograph')

    if (!voice) {
      throw new Error('no pad voice')
    }

    return voice
  }

  it('gives each hit its own note', () => {
    const notes = renderVoice(pad()).notes.map((note) => note.note)

    expect(notes.length).toBeGreaterThan(2)
    expect(new Set(notes).size).toBeGreaterThan(1)
  })

  it('stays inside the scale it was given', () => {
    const voice = pad()
    const intervals = scaleIntervals[voice.pitch.scale]

    for (const note of renderVoice(voice).notes) {
      const within = (((note.note - voice.pitch.root) % 12) + 12) % 12

      expect(intervals).toContain(within)
    }
  })

  it('stays inside the octave range it was given', () => {
    const voice = pad()

    for (const note of renderVoice(voice).notes) {
      expect(note.note).toBeGreaterThanOrEqual(voice.pitch.root)
      expect(note.note).toBeLessThanOrEqual(
        voice.pitch.root + voice.pitch.octaves * 12,
      )
    }
  })

  it('follows the pitch source', () => {
    const voice = pad()
    const byRadius = renderVoice({
      ...voice,
      pitch: { ...voice.pitch, source: 'radius' },
    }).notes.map((note) => note.note)
    const byAngle = renderVoice({
      ...voice,
      pitch: { ...voice.pitch, source: 'angle' },
    }).notes.map((note) => note.note)

    expect(byAngle).not.toEqual(byRadius)
  })

  it('holds one drum for a percussion voice', () => {
    const notes = renderVoice(byId('kick-rose')).notes.map((note) => note.note)

    expect(new Set(notes)).toEqual(new Set([36]))
  })
})
