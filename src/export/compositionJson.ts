import { compositionVersion, type Composition } from '../core/composition'
import {
  validateComposition,
  type CompositionValidationIssue,
} from '../core/compositionValidation'

export type CompositionJsonErrorCode =
  | 'invalid-json'
  | 'unsupported-version'
  | 'invalid-composition'

export type CompositionJsonImportResult =
  | { ok: true; composition: Composition }
  | {
      ok: false
      code: CompositionJsonErrorCode
      error: string
      issues?: Array<CompositionValidationIssue>
    }

export const exportCompositionToJson = (composition: Composition) =>
  JSON.stringify(composition, null, 2)

export const downloadCompositionJson = (composition: Composition) => {
  const blob = new Blob([exportCompositionToJson(composition)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileStem(composition.name)}.spirophonic.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export const parseCompositionJson = (
  json: string,
): CompositionJsonImportResult => {
  let value: unknown

  try {
    value = JSON.parse(json) as unknown
  } catch {
    return {
      ok: false,
      code: 'invalid-json',
      error: 'File is not valid JSON.',
    }
  }

  if (isObject(value) && typeof value.version === 'string') {
    if (value.version !== compositionVersion) {
      return {
        ok: false,
        code: 'unsupported-version',
        error: `Unsupported Spirophonic Composition version "${value.version}"; expected "${compositionVersion}".`,
      }
    }
  }

  const result = validateComposition(value)

  if (!result.ok) {
    return {
      ok: false,
      code: 'invalid-composition',
      error: 'File is not a valid Spirophonic Composition.',
      issues: result.issues,
    }
  }

  return { ok: true, composition: result.composition }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fileStem = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'composition'
