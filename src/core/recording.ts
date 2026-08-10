import type { Composition } from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
import type {
  CanonicalPerformance,
  NoteMusicalEvent,
} from './performance'
import type { GateModulationLane } from './gateModulation'
import { randomVersion } from './random'
import type { PerformanceRequest } from './transport'
import type { VariationTraceEntry } from './variation'

/** Bump when the Recording shape changes in a way older readers cannot handle. */
export const recordingVersion = 2

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
  maxModulationLanes?: number
  maxModulationSamples?: number
}>

export const recordingLimits: RecordingLimits = Object.freeze({
  maxEncounters: 50_000,
  maxEvents: 50_000,
  maxModulationLanes: 10_000,
  maxModulationSamples: 100_000,
})

export type RecordingTruncation = Readonly<{
  layer:
    | 'encounters'
    | 'interpretedEvents'
    | 'performedEvents'
    | 'modulationLanes'
    | 'modulationSamples'
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
  modulationLanes: ReadonlyArray<GateModulationLane>
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

const captureModulationLanes = (
  lanes: ReadonlyArray<GateModulationLane>,
  eventIds: ReadonlySet<string>,
  limits: RecordingLimits,
  truncations: Array<RecordingTruncation>,
): ReadonlyArray<GateModulationLane> => {
  const eligible = lanes.filter((lane) => eventIds.has(lane.noteEventId))
  const laneLimit =
    limits.maxModulationLanes ?? recordingLimits.maxModulationLanes ?? 10_000
  const sampleLimit =
    limits.maxModulationSamples ??
    recordingLimits.maxModulationSamples ??
    100_000
  const selected = eligible.slice(0, laneLimit)
  if (selected.length < eligible.length) {
    const dropped = eligible.length - selected.length
    truncations.push(
      Object.freeze({
        layer: 'modulationLanes' as const,
        kept: selected.length,
        dropped,
        message: `Recording kept ${selected.length} modulationLanes and dropped ${dropped}. Shorten the window or raise the limit; the Recording is incomplete.`,
      }),
    )
  }

  const captured: Array<GateModulationLane> = []
  let remaining = sampleLimit
  let droppedSamples = 0
  for (const lane of selected) {
    if (remaining <= 0) {
      droppedSamples += lane.samples.length
      continue
    }
    if (lane.samples.length <= remaining) {
      captured.push(lane)
      remaining -= lane.samples.length
      continue
    }

    const keep = remaining
    const samples =
      keep === 1
        ? [lane.samples[0]]
        : [
            ...lane.samples.slice(0, keep - 1),
            lane.samples[lane.samples.length - 1],
          ]
    droppedSamples += lane.samples.length - samples.length
    captured.push(
      Object.freeze({
        ...lane,
        truncated: true,
        samples: Object.freeze(samples),
      }),
    )
    remaining = 0
  }
  if (droppedSamples > 0) {
    truncations.push(
      Object.freeze({
        layer: 'modulationSamples' as const,
        kept: sampleLimit,
        dropped: droppedSamples,
        message: `Recording kept ${sampleLimit} modulationSamples and dropped ${droppedSamples}. Shorten the window or raise the limit; the Recording is incomplete.`,
      }),
    )
  }
  return Object.freeze(captured)
}

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
  const modulationLanes = captureModulationLanes(
    input.performance.modulationLanes,
    new Set(performedEvents.map((event) => event.id)),
    limits,
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
    modulationLanes,
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
