import type { SpirophonicModel } from '../core/model'

export type JsonImportResult =
  | { ok: true; model: SpirophonicModel }
  | { ok: false; error: string }

export const exportModelToJson = (model: SpirophonicModel) =>
  JSON.stringify(model, null, 2)

export const parseModelJson = (json: string): JsonImportResult => {
  try {
    const value = JSON.parse(json) as unknown

    if (!isSpirophonicModel(value)) {
      return { ok: false, error: 'File is not a valid Spirophonic v0.1 model.' }
    }

    return { ok: true, model: value }
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
}

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
    value.version === '0.1' &&
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

