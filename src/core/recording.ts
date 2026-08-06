import type { Composition } from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
import type {
  CanonicalPerformance,
  NoteMusicalEvent,
} from './performance'
import { randomVersion } from './random'
import type { PerformanceRequest } from './transport'
import type { VariationTraceEntry } from './variation'

/** Bump when the Recording shape changes in a way older readers cannot handle. */
export const recordingVersion = 1

/**
 * The compiler's own version. A Recording carries it so a later engine can say
 * that replaying is exact but recompiling might not be.
 */
export const engineVersion = 1

export type RecordingProvenance = Readonly<{
  recordingVersion: number
  engineVersion: number
  randomVersion: number
  recordedAt: string
}>

export type RecordingLimits = Readonly<{
  maxEncounters: number
  maxEvents: number
}>

export const recordingLimits: RecordingLimits = Object.freeze({
  maxEncounters: 50_000,
  maxEvents: 50_000,
})

export type RecordingTruncation = Readonly<{
  layer: 'encounters' | 'interpretedEvents' | 'performedEvents'
  kept: number
  dropped: number
  message: string
}>

/**
 * A durable capture of one performance window, holding all three layers.
 *
 * The Composition snapshot is included so a Recording can be understood and
 * reinterpreted later, but replay never reads it: performed events are replayed
 * straight from the recorded layer, which is what lets a Recording outlive the
 * Wheels and Fields that produced it.
 */
export type Recording = Readonly<{
  id: string
  name: string
  provenance: RecordingProvenance
  composition: Composition
  request: Readonly<PerformanceRequest>
  encounters: ReadonlyArray<BoundaryCrossingEncounter>
  interpretedEvents: ReadonlyArray<NoteMusicalEvent>
  performedEvents: ReadonlyArray<NoteMusicalEvent>
  variationTrace: ReadonlyArray<VariationTraceEntry>
  truncations: ReadonlyArray<RecordingTruncation>
}>

export type RecordingWindow = Readonly<{
  startSeconds: number
  endSeconds: number
}>

const truncate = <T>(
  values: ReadonlyArray<T>,
  limit: number,
  layer: RecordingTruncation['layer'],
  truncations: Array<RecordingTruncation>,
): ReadonlyArray<T> => {
  if (values.length <= limit) return Object.freeze([...values])

  const dropped = values.length - limit
  truncations.push(
    Object.freeze({
      layer,
      kept: limit,
      dropped,
      message: `Recording kept the first ${limit} ${layer} and dropped ${dropped}. Shorten the window or raise the limit; the Recording is incomplete.`,
    }),
  )
  return Object.freeze(values.slice(0, limit))
}

const withinWindow = (timeSeconds: number, window: RecordingWindow) =>
  timeSeconds >= window.startSeconds - 1e-12 &&
  timeSeconds <= window.endSeconds + 1e-12

/**
 * Captures a performance over an explicit Transport window.
 *
 * Truncation is always reported. A Recording that silently dropped events would
 * replay as a different piece of music while looking complete.
 */
export const createRecording = (
  input: Readonly<{
    id: string
    name: string
    composition: Composition
    performance: CanonicalPerformance
    window?: RecordingWindow
    recordedAt?: string
    limits?: RecordingLimits
  }>,
): Recording => {
  const limits = input.limits ?? recordingLimits
  const window: RecordingWindow = input.window ?? {
    startSeconds: input.performance.request.startSeconds,
    endSeconds:
      input.performance.request.startSeconds +
      input.performance.request.durationSeconds,
  }
  if (window.endSeconds < window.startSeconds) {
    throw new RangeError('A recording window must not end before it starts.')
  }

  const truncations: Array<RecordingTruncation> = []
  const encounters = truncate(
    input.performance.encounters.filter((item) =>
      withinWindow(item.timeSeconds, window),
    ),
    limits.maxEncounters,
    'encounters',
    truncations,
  )
  const interpretedEvents = truncate(
    input.performance.interpretedEvents.filter((item) =>
      withinWindow(item.timeSeconds, window),
    ),
    limits.maxEvents,
    'interpretedEvents',
    truncations,
  )
  const performedEvents = truncate(
    input.performance.performedEvents.filter((item) =>
      withinWindow(item.timeSeconds, window),
    ),
    limits.maxEvents,
    'performedEvents',
    truncations,
  )

  return Object.freeze({
    id: input.id,
    name: input.name,
    provenance: Object.freeze({
      recordingVersion,
      engineVersion,
      randomVersion,
      recordedAt: input.recordedAt ?? '1970-01-01T00:00:00.000Z',
    }),
    composition: structuredClone(input.composition) as Composition,
    request: Object.freeze({ ...input.performance.request }),
    encounters,
    interpretedEvents,
    performedEvents,
    variationTrace: Object.freeze([...input.performance.variationTrace]),
    truncations: Object.freeze(truncations),
  })
}

export type ProvenanceWarning = Readonly<{
  code: 'recording-version' | 'engine-version' | 'random-version'
  message: string
}>

/** Reports every version mismatch rather than refusing to open the Recording. */
export const provenanceWarnings = (
  recording: Recording,
): ReadonlyArray<ProvenanceWarning> => {
  const warnings: Array<ProvenanceWarning> = []
  const { provenance } = recording

  if (provenance.recordingVersion !== recordingVersion) {
    warnings.push(
      Object.freeze({
        code: 'recording-version' as const,
        message: `Recording format version ${provenance.recordingVersion} differs from this engine's ${recordingVersion}.`,
      }),
    )
  }
  if (provenance.engineVersion !== engineVersion) {
    warnings.push(
      Object.freeze({
        code: 'engine-version' as const,
        message: `Recorded under engine version ${provenance.engineVersion}; this engine is ${engineVersion}. Replay is exact, but recompiling this Composition may not reproduce the recorded events.`,
      }),
    )
  }
  if (provenance.randomVersion !== randomVersion) {
    warnings.push(
      Object.freeze({
        code: 'random-version' as const,
        message: `Recorded under randomness version ${provenance.randomVersion}; this engine is ${randomVersion}. Seeded variation would reroll rather than reproduce.`,
      }),
    )
  }

  return Object.freeze(warnings)
}
