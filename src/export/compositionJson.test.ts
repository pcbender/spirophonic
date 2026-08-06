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
