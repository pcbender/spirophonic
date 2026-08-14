import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import {
  exportCompositionToJson,
  parseCompositionJson,
} from './compositionJson'

const cloneDefault = () => structuredClone(defaultComposition) as Composition

describe('v1 Composition JSON', () => {
  it('round-trips the default Composition deterministically', () => {
    const first = exportCompositionToJson(cloneDefault())
    const second = exportCompositionToJson(cloneDefault())
    const result = parseCompositionJson(first)

    expect(first).toBe(second)
    expect(result).toEqual({
      ok: true,
      composition: defaultComposition,
    })
  })

  it('round-trips a closed radial wave family without normalization', () => {
    const composition = cloneDefault()
    composition.wheels[0].motion = {
      kind: 'wave',
      waveform: 'square',
      amplitude: 36,
      periodicity: 8,
    }
    composition.wheels[0].heads[0].attachment = {
      kind: 'wave',
      baseRadius: 144,
    }

    expect(parseCompositionJson(exportCompositionToJson(composition))).toEqual({
      ok: true,
      composition,
    })
  })

  it('round-trips a fixed-note SoundFont one-shot without normalization', () => {
    const composition = cloneDefault()
    composition.instruments.push({
      id: 'instrument-one-shot',
      name: 'Kick',
      kind: 'soundfont',
      gain: 0.5,
      pan: 0,
      soundBankId: composition.soundBanks[0].id,
      bank: 0,
      program: 0,
      presetName: 'Drum Samples',
      percussion: false,
      trigger: { kind: 'one-shot', note: 36 },
      reverb: 0.2,
      chorus: 0,
    })

    expect(parseCompositionJson(exportCompositionToJson(composition))).toEqual({
      ok: true,
      composition,
    })
  })

  it('round-trips a transformed figure sequence without normalization', () => {
    const composition = cloneDefault()
    const part = composition.parts[0]
    if (part.kind !== 'note') throw new Error('Expected the default note Part.')
    part.pitch = {
      kind: 'figure-sequence',
      accessMode: 'lifo',
      endBehavior: 'hold',
      resetOn: 'wheel-cycle',
      root: 62,
      scale: 'dorian',
      transform: {
        kind: 'retrograde-inversion',
        transpose: -2,
        axis: 62,
        intervalScale: 1.5,
      },
      figures: [
        { kind: 'note', note: 62 },
        { kind: 'chord', notes: [65, 69, 72] },
        { kind: 'scale-degree', degree: 5 },
        { kind: 'pitch-class-set', pitchClasses: [0, 3, 7] },
        { kind: 'interval-structure', intervals: [0, 5, 10] },
      ],
    }

    expect(parseCompositionJson(exportCompositionToJson(composition))).toEqual({
      ok: true,
      composition,
    })
  })

  it('rejects invalid JSON with a specific code', () => {
    expect(parseCompositionJson('{not json')).toEqual({
      ok: false,
      code: 'invalid-json',
      error: 'File is not valid JSON.',
    })
  })

  it.each(['0.1', '0.2'])('rejects legacy version %s explicitly', (version) => {
    const legacy = {
      id: 'legacy',
      name: 'Legacy',
      version,
      geometry: {},
    }

    expect(parseCompositionJson(JSON.stringify(legacy))).toEqual({
      ok: false,
      code: 'unsupported-version',
      error: `Unsupported Spirophonic Composition version "${version}"; expected "1.0".`,
    })
  })

  it('returns path-specific validation issues', () => {
    const composition = cloneDefault()

    composition.wheels[0].heads[0].id = 'instrument-1'
    const result = parseCompositionJson(JSON.stringify(composition))

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.code).toBe('invalid-composition')
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '$.instruments[0].id' }),
      ]),
    )
  })

  it('rejects unknown fields rather than normalizing them away', () => {
    const composition = cloneDefault() as unknown as Record<string, unknown>

    composition.geometry = { family: 'spirogram' }
    const result = parseCompositionJson(JSON.stringify(composition))

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.issues).toContainEqual({
      path: '$.geometry',
      message: 'Unknown property.',
    })
  })
})
