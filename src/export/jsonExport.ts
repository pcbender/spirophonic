import { curveFamilies } from '../core/curves'
import { defaultVoices } from '../core/defaultModel'
import { familyDefaults, type CurveFamily, type SpirophonicModel } from '../core/model'

export type JsonImportResult =
  | { ok: true; model: SpirophonicModel }
  | { ok: false; error: string }

const supportedVersions = ['0.1', '0.2']

export const exportModelToJson = (model: SpirophonicModel) =>
  JSON.stringify({ ...model, version: '0.2' }, null, 2)

export const parseModelJson = (json: string): JsonImportResult => {
  try {
    const value = JSON.parse(json) as unknown

    if (!isSpirophonicModel(value)) {
      return { ok: false, error: 'File is not a valid Spirophonic model.' }
    }

    return { ok: true, model: upgradeModel(value) }
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
}

/**
 * A v0.1 document predates every curve family field, so it inherits the
 * spirogram defaults and keeps rendering exactly as it did.
 */
const upgradeModel = (value: Record<string, unknown>): SpirophonicModel => {
  const geometry = value.geometry as Record<string, unknown>
  const family = geometry.family

  return {
    ...(value as unknown as SpirophonicModel),
    version: '0.2',
    geometry: {
      ...familyDefaults,
      ...(geometry as unknown as SpirophonicModel['geometry']),
      family: isCurveFamily(family) ? family : familyDefaults.family,
    },
    voices: Array.isArray(value.voices)
      ? (value.voices as SpirophonicModel['voices'])
      : defaultVoices,
  }
}

const isCurveFamily = (value: unknown): value is CurveFamily =>
  typeof value === 'string' && curveFamilies.includes(value as CurveFamily)

export const downloadModelJson = (model: SpirophonicModel) => {
  const blob = new Blob([exportModelToJson(model)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const isSpirophonicModel = (value: unknown): value is SpirophonicModel => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.version === 'string' &&
    supportedVersions.includes(value.version) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isRecord(value.geometry) &&
    isRecord(value.time) &&
    isRecord(value.sound) &&
    isRecord(value.color) &&
    hasNumbers(value.geometry, [
      'fixedRadius',
      'movingRadius',
      'penOffset',
      'phase',
      'samples',
    ]) &&
    (value.geometry.rotation === 'inside' ||
      value.geometry.rotation === 'outside') &&
    hasNumbers(value.time, ['cyclesPerSecond', 'durationSeconds']) &&
    typeof value.sound.enabled === 'boolean' &&
    hasNumbers(value.sound, [
      'baseFrequencyHz',
      'minFrequencyHz',
      'maxFrequencyHz',
    ]) &&
    typeof value.sound.frequencyMode === 'string' &&
    typeof value.sound.waveform === 'string' &&
    typeof value.color.hueSource === 'string' &&
    hasNumbers(value.color, ['saturation', 'lightness'])
  )
}

const hasNumbers = (value: Record<string, unknown>, keys: Array<string>) =>
  keys.every((key) => typeof value[key] === 'number')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

