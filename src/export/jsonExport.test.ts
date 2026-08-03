import { describe, expect, it } from 'vitest'
import { generateCurvePoints } from '../core/curves'
import { defaultModel } from '../core/defaultModel'
import { familyDefaults } from '../core/model'
import { generateSpiroPoints } from '../core/trochoid'
import { exportModelToJson, parseModelJson } from './jsonExport'

/**
 * A verbatim v0.1 document, as written by the release before curve families
 * existed. Kept literal rather than derived so a change to the current model
 * cannot quietly redefine what an old file looked like.
 */
const legacyDocument = JSON.stringify({
  id: 'default-simple-flower',
  name: 'Simple Flower',
  version: '0.1',
  geometry: {
    fixedRadius: 180,
    movingRadius: 65,
    penOffset: 95,
    phase: 0,
    rotation: 'inside',
    samples: 900,
  },
  time: { cyclesPerSecond: 0.2, durationSeconds: 8 },
  sound: {
    enabled: false,
    baseFrequencyHz: 220,
    frequencyMode: 'radius',
    minFrequencyHz: 110,
    maxFrequencyHz: 660,
    waveform: 'sine',
  },
  color: { hueSource: 'angle', saturation: 82, lightness: 58 },
})

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

  it('always writes the current version', () => {
    const written = JSON.parse(
      exportModelToJson({ ...defaultModel, version: '0.2' }),
    )

    expect(written.version).toBe('0.2')
  })
})

describe('v0.1 documents', () => {
  it('still loads', () => {
    expect(parseModelJson(legacyDocument).ok).toBe(true)
  })

  it('inherits the spirogram family', () => {
    const result = parseModelJson(legacyDocument)

    if (!result.ok) {
      throw new Error(result.error)
    }

    expect(result.model.version).toBe('0.2')
    expect(result.model.geometry.family).toBe('spirogram')
    expect(result.model.geometry.roseN).toBe(familyDefaults.roseN)
  })

  it('renders exactly the points it always did', () => {
    const result = parseModelJson(legacyDocument)

    if (!result.ok) {
      throw new Error(result.error)
    }

    expect(generateCurvePoints(result.model)).toEqual(
      generateSpiroPoints(result.model),
    )
    expect(generateCurvePoints(result.model)).toEqual(
      generateCurvePoints(defaultModel),
    )
  })

  it('ignores a family it does not recognize', () => {
    const result = parseModelJson(
      JSON.stringify({
        ...JSON.parse(legacyDocument),
        geometry: { ...JSON.parse(legacyDocument).geometry, family: 'trefoil' },
      }),
    )

    if (!result.ok) {
      throw new Error(result.error)
    }

    expect(result.model.geometry.family).toBe('spirogram')
  })
})
