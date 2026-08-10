import type { Recording } from '../core/recording'
import { recordingVersion } from '../core/recording'

export type RecordingParseResult =
  | Readonly<{ ok: true; recording: Recording }>
  | Readonly<{ ok: false; issues: ReadonlyArray<string> }>

/**
 * Serializes with sorted keys at every level, so the same Recording always
 * produces byte-identical JSON and two Recordings can be diffed meaningfully.
 */
const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key])
    }
    return sorted
  }
  return value
}

export const exportRecordingToJson = (recording: Recording) =>
  `${JSON.stringify(sortKeysDeep(recording), null, 2)}\n`

export const parseRecordingJson = (text: string): RecordingParseResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return Object.freeze({
      ok: false as const,
      issues: Object.freeze([
        `Recording JSON could not be parsed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ]),
    })
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return Object.freeze({
      ok: false as const,
      issues: Object.freeze(['Expected a Recording object.']),
    })
  }

  const record = parsed as Record<string, unknown>
  const issues: Array<string> = []
  const provenance = record.provenance as Record<string, unknown> | undefined

  for (const key of [
    'id',
    'name',
    'provenance',
    'composition',
    'request',
    'encounters',
    'interpretedEvents',
    'performedEvents',
    'modulationLanes',
  ]) {
    if (record[key] === undefined) issues.push(`Missing "${key}".`)
  }
  if (provenance && typeof provenance.recordingVersion !== 'number') {
    issues.push('Missing provenance.recordingVersion.')
  }
  // A newer format is refused rather than partially read.
  if (
    provenance &&
    typeof provenance.recordingVersion === 'number' &&
    provenance.recordingVersion > recordingVersion
  ) {
    issues.push(
      `Recording format version ${provenance.recordingVersion} is newer than this engine's ${recordingVersion}.`,
    )
  }

  if (issues.length > 0) {
    return Object.freeze({ ok: false as const, issues: Object.freeze(issues) })
  }
  return Object.freeze({ ok: true as const, recording: parsed as Recording })
}
