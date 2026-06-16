import { describe, expect, it } from 'vitest'
import { defaultModel } from '../core/defaultModel'
import { exportModelToJson, parseModelJson } from './jsonExport'

describe('JSON model export/import', () => {
  it('round-trips a model', () => {
    const result = parseModelJson(exportModelToJson(defaultModel))

    expect(result).toEqual({ ok: true, model: defaultModel })
  })

  it('rejects invalid JSON', () => {
    const result = parseModelJson('{not json')

    expect(result.ok).toBe(false)
  })

  it('checks the version field', () => {
    const result = parseModelJson(
      JSON.stringify({ ...defaultModel, version: '0.0' }),
    )

    expect(result.ok).toBe(false)
  })
})

