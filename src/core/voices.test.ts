import { describe, expect, it } from 'vitest'

import { defaultModel, defaultVoices } from './defaultModel'
import { generateCurvePoints } from './curves'
import { scaleIntervals } from './scales'
import { renderVoice as render, renderVoices, voiceGeometry } from './voices'

/** Voices resolve against the main shape, so tests supply it too. */
const renderVoice = (voice: Parameters<typeof render>[0]) =>
  render(voice, defaultModel.geometry)

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

describe('voices follow the main shape', () => {
  const kick = () => byId('kick-rose')

  it('inherits everything it does not override', () => {
    const base = { ...defaultModel.geometry, samples: 400, phase: 0.3 }

    expect(voiceGeometry(base, kick())).toMatchObject({
      samples: 400,
      phase: 0.3,
      family: 'rose',
      roseN: 5,
    })
  })

  it('moves the music when the relationship moves', () => {
    // Phase rotates the curve, so every onset shifts with it. Before voices
    // inherited the main geometry, editing the relationship or loading a
    // preset changed the drawing and left the part alone.
    const before = render(kick(), defaultModel.geometry).notes.map((note) => note.t)
    const after = render(kick(), {
      ...defaultModel.geometry,
      phase: Math.PI / 3,
    }).notes.map((note) => note.t)

    expect(after).not.toEqual(before)
  })

  it('changes the rhythm when the main shape changes family', () => {
    const voice = { ...kick(), geometry: {} }
    const asRose = render(voice, { ...defaultModel.geometry, family: 'rose' as const })
    const asLissajous = render(voice, {
      ...defaultModel.geometry,
      family: 'lissajous' as const,
    })

    expect(asRose.notes.length).not.toBe(asLissajous.notes.length)
  })

  it('reads the main curve itself when it overrides nothing', () => {
    const voice = { ...kick(), geometry: {} }

    expect(render(voice, defaultModel.geometry).points).toEqual(
      generateCurvePoints(defaultModel),
    )
  })

  it('keeps its own family when the main shape changes', () => {
    const rose = render(kick(), {
      ...defaultModel.geometry,
      family: 'lissajous' as const,
    })

    expect(rose.notes).toHaveLength(5)
  })

  it('follows the petal count set on the main shape', () => {
    const voice = { ...kick(), geometry: { family: 'rose' as const } }

    expect(render(voice, { ...defaultModel.geometry, roseN: 7 }).notes).toHaveLength(7)
    expect(render(voice, { ...defaultModel.geometry, roseN: 3 }).notes).toHaveLength(3)
  })
})
