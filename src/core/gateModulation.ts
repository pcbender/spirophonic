import type {
  Composition,
  GateModulationMapping,
  GateModulationSource,
  GateModulationTarget,
  NotePartSpec,
  Point2,
} from './composition'
import type { BoundaryCrossingEncounter } from './encounters'
import {
  boundaryGeometryAtPlacement,
  fieldPlacementAt,
  type BoundaryGeometry,
} from './fields'
import { headStateAt } from './heads'
import type { NoteMusicalEvent } from './performance'

const TAU = Math.PI * 2
const epsilon = 1e-12

export const gateModulationLimits = Object.freeze({
  maxLanes: 10_000,
  maxSamplesPerLane: 4_096,
  maxTotalSamples: 100_000,
})

export type GateModulationSample = Readonly<{
  timeSeconds: number
  position: Readonly<Point2>
  /** Normalized physical source before curve and smoothing, in [0, 1]. */
  sourceValue: number
  /** Curved and smoothed source, in [0, 1]. */
  normalizedValue: number
  /** Value in the mapping's authored target range. */
  value: number
}>

export type GateModulationLane = Readonly<{
  id: string
  mappingId: string
  noteEventId: string
  sourceEncounterId: string
  exitEncounterId: string
  partId: string
  instrumentId: string
  wheelId: string
  headId: string
  fieldId: string
  boundaryId: string
  source: GateModulationSource
  target: GateModulationTarget
  sampleRateHz: number
  minimum: number
  maximum: number
  curve: number
  smoothingSeconds: number
  entryOnly: boolean
  startSeconds: number
  endSeconds: number
  truncated: boolean
  samples: ReadonlyArray<GateModulationSample>
}>

export type GateModulationDiagnostic = Readonly<{
  code: 'missing-region' | 'unsupported-source' | 'lane-limit' | 'sample-limit'
  message: string
  partId: string
  mappingId: string
  noteEventId?: string
}>

export type GateModulationCompileResult = Readonly<{
  lanes: ReadonlyArray<GateModulationLane>
  diagnostics: ReadonlyArray<GateModulationDiagnostic>
}>

export type GateModulationPathState = Readonly<{
  timeSeconds: number
  position: Readonly<Point2>
  velocity: Readonly<Point2>
}>

export type GateModulationLaneInput = Readonly<{
  mapping: GateModulationMapping
  note: NoteMusicalEvent
  entry: BoundaryCrossingEncounter
  exit: BoundaryCrossingEncounter
  boundaryAt: (timeSeconds: number) => BoundaryGeometry
  stateAt: (timeSeconds: number) => GateModulationPathState
  referenceDistance: number
  maxSamples?: number
}>

const freezePoint = (value: Readonly<Point2>): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const signedAngleDifference = (from: number, to: number) => {
  const raw = (to - from) % TAU
  return raw > Math.PI ? raw - TAU : raw <= -Math.PI ? raw + TAU : raw
}

const laneId = (noteEventId: string, mappingId: string) =>
  ['gate-modulation', noteEventId, mappingId]
    .map(encodeURIComponent)
    .join('/')

const sampleTimes = (
  startSeconds: number,
  endSeconds: number,
  sampleRateHz: number,
  entryOnly: boolean,
  maxSamples: number,
) => {
  if (entryOnly || endSeconds <= startSeconds + epsilon) {
    return { times: [startSeconds], truncated: false }
  }

  const theoreticalInterior = Math.max(
    0,
    Math.ceil((endSeconds - startSeconds) * sampleRateHz) - 1,
  )
  const theoreticalCount = theoreticalInterior + 2
  const limit = Math.max(2, Math.floor(maxSamples))
  const times = [startSeconds]

  for (
    let step = 1;
    step <= theoreticalInterior && times.length < limit - 1;
    step += 1
  ) {
    const timeSeconds = startSeconds + step / sampleRateHz
    if (timeSeconds < endSeconds - epsilon) times.push(timeSeconds)
  }
  times.push(endSeconds)

  return { times, truncated: theoreticalCount > times.length }
}

const assertState = (state: GateModulationPathState, timeSeconds: number) => {
  if (
    state.timeSeconds !== timeSeconds ||
    !Number.isFinite(state.position.x) ||
    !Number.isFinite(state.position.y) ||
    !Number.isFinite(state.velocity.x) ||
    !Number.isFinite(state.velocity.y)
  ) {
    throw new RangeError(
      'A gate-modulation path evaluator must return the requested time and finite state.',
    )
  }
}

const sourceAt = (
  source: GateModulationSource,
  timeSeconds: number,
  startSeconds: number,
  endSeconds: number,
  boundary: BoundaryGeometry,
  stateAt: (timeSeconds: number) => GateModulationPathState,
  referenceDistance: number,
) => {
  const state = stateAt(timeSeconds)
  assertState(state, timeSeconds)
  const dx = state.position.x - boundary.center.x
  const dy = state.position.y - boundary.center.y

  if (source === 'cross-wedge-position') {
    if (boundary.kind !== 'spoke' || boundary.angularWidth <= 0) return undefined
    const pointAngle = Math.atan2(dy, dx)
    const offset = signedAngleDifference(boundary.angle, pointAngle)
    return clamp01(0.5 + offset / boundary.angularWidth)
  }
  if (source === 'radius') {
    return clamp01(Math.hypot(dx, dy) / referenceDistance)
  }
  const speed = Math.hypot(state.velocity.x, state.velocity.y)
  if (source === 'speed') {
    // One reference-radius revolution per second maps to the top of the lane.
    return clamp01(speed / (referenceDistance * TAU))
  }

  const derivativeStep = Math.min(
    1 / 240,
    Math.max(epsilon, (endSeconds - startSeconds) / 100),
  )
  const beforeTime = Math.max(startSeconds, timeSeconds - derivativeStep)
  const afterTime = Math.min(endSeconds, timeSeconds + derivativeStep)
  if (afterTime <= beforeTime + epsilon || speed <= epsilon) return 0
  const before = stateAt(beforeTime)
  const after = stateAt(afterTime)
  assertState(before, beforeTime)
  assertState(after, afterTime)
  const inverseDelta = 1 / (afterTime - beforeTime)
  const acceleration = {
    x: (after.velocity.x - before.velocity.x) * inverseDelta,
    y: (after.velocity.y - before.velocity.y) * inverseDelta,
  }
  const curvature =
    Math.abs(
      state.velocity.x * acceleration.y -
        state.velocity.y * acceleration.x,
    ) / speed ** 3
  return clamp01(curvature * referenceDistance)
}

const isEntryOnly = (target: GateModulationTarget) =>
  target === 'attack' || target === 'initial-velocity'

/** Compiles one mapping for one already-paired note without creating onsets. */
export const compileGateModulationLane = (
  input: GateModulationLaneInput,
): GateModulationLane | null => {
  const startSeconds = input.entry.timeSeconds
  const endSeconds = input.exit.timeSeconds
  const entryOnly = isEntryOnly(input.mapping.target)
  const { times, truncated } = sampleTimes(
    startSeconds,
    endSeconds,
    input.mapping.sampleRateHz,
    entryOnly,
    input.maxSamples ?? gateModulationLimits.maxSamplesPerLane,
  )
  const referenceDistance = Math.max(epsilon, input.referenceDistance)
  const samples: Array<GateModulationSample> = []
  let smoothed = 0

  for (let index = 0; index < times.length; index += 1) {
    const timeSeconds = times[index]
    const boundary = input.boundaryAt(timeSeconds)
    const state = input.stateAt(timeSeconds)
    assertState(state, timeSeconds)
    const sourceValue = sourceAt(
      input.mapping.source,
      timeSeconds,
      startSeconds,
      endSeconds,
      boundary,
      input.stateAt,
      referenceDistance,
    )
    if (sourceValue === undefined) return null

    const curved = clamp01(sourceValue) ** input.mapping.curve
    if (index === 0 || input.mapping.smoothingSeconds === 0) {
      smoothed = curved
    } else {
      const delta = timeSeconds - times[index - 1]
      const alpha = delta / (input.mapping.smoothingSeconds + delta)
      smoothed += alpha * (curved - smoothed)
    }
    const normalizedValue = clamp01(smoothed)
    const value = Math.min(
      input.mapping.maximum,
      Math.max(
        input.mapping.minimum,
        input.mapping.minimum +
          (input.mapping.maximum - input.mapping.minimum) * normalizedValue,
      ),
    )
    samples.push(
      Object.freeze({
        timeSeconds,
        position: freezePoint(state.position),
        sourceValue: clamp01(sourceValue),
        normalizedValue,
        value,
      }),
    )
  }

  return Object.freeze({
    id: laneId(input.note.id, input.mapping.id),
    mappingId: input.mapping.id,
    noteEventId: input.note.id,
    sourceEncounterId: input.entry.id,
    exitEncounterId: input.exit.id,
    partId: input.note.partId,
    instrumentId: input.note.instrumentId,
    wheelId: input.entry.wheelId,
    headId: input.entry.headId,
    fieldId: input.entry.fieldId,
    boundaryId: input.entry.boundaryId,
    source: input.mapping.source,
    target: input.mapping.target,
    sampleRateHz: input.mapping.sampleRateHz,
    minimum: input.mapping.minimum,
    maximum: input.mapping.maximum,
    curve: input.mapping.curve,
    smoothingSeconds: input.mapping.smoothingSeconds,
    entryOnly,
    startSeconds,
    endSeconds,
    truncated,
    samples: Object.freeze(samples),
  })
}

const matchingExit = (
  entry: BoundaryCrossingEncounter,
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
) =>
  encounters.find(
    (encounter) =>
      encounter.timeSeconds > entry.timeSeconds &&
      encounter.wheelId === entry.wheelId &&
      encounter.headId === entry.headId &&
      encounter.fieldId === entry.fieldId &&
      encounter.boundaryId === entry.boundaryId &&
      encounter.transition === 'exit',
  )

const noteParts = (composition: Composition) =>
  new Map(
    composition.parts
      .filter((part): part is NotePartSpec => part.kind === 'note')
      .map((part) => [part.id, part]),
  )

/** Compiles every enabled mapping against canonical performed note spans. */
export const compileGateModulationLanes = (
  composition: Composition,
  notes: ReadonlyArray<NoteMusicalEvent>,
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
): GateModulationCompileResult => {
  const parts = noteParts(composition)
  const encountersById = new Map(encounters.map((item) => [item.id, item]))
  const lanes: Array<GateModulationLane> = []
  const diagnostics: Array<GateModulationDiagnostic> = []
  let totalSamples = 0

  for (const note of notes) {
    const part = parts.get(note.partId)
    const mappings = part?.gateModulations?.filter((mapping) => mapping.enabled) ?? []
    if (mappings.length === 0) continue
    const entry = encountersById.get(note.sourceEncounterId)
    const exit = entry ? matchingExit(entry, encounters) : undefined
    const field = entry
      ? composition.fields.find((candidate) => candidate.id === entry.fieldId)
      : undefined
    const boundary = field?.boundaries.find(
      (candidate) => candidate.id === entry?.boundaryId,
    )

    for (const mapping of mappings) {
      if (!entry || entry.transition !== 'enter' || !exit || !field || !boundary) {
        diagnostics.push(
          Object.freeze({
            code: 'missing-region' as const,
            message: `Mapping "${mapping.name}" needs a complete saved region span; no lane was emitted for note "${note.id}".`,
            partId: note.partId,
            mappingId: mapping.id,
            noteEventId: note.id,
          }),
        )
        continue
      }
      if (lanes.length >= gateModulationLimits.maxLanes) {
        diagnostics.push(
          Object.freeze({
            code: 'lane-limit' as const,
            message: `Gate modulation stopped at ${gateModulationLimits.maxLanes} lanes.`,
            partId: note.partId,
            mappingId: mapping.id,
            noteEventId: note.id,
          }),
        )
        return Object.freeze({
          lanes: Object.freeze(lanes),
          diagnostics: Object.freeze(diagnostics),
        })
      }

      const remainingSamples = gateModulationLimits.maxTotalSamples - totalSamples
      const samplesRequired = isEntryOnly(mapping.target) ? 1 : 2
      if (remainingSamples < samplesRequired) {
        diagnostics.push(
          Object.freeze({
            code: 'sample-limit' as const,
            message: `Gate modulation stopped at ${gateModulationLimits.maxTotalSamples} total samples.`,
            partId: note.partId,
            mappingId: mapping.id,
            noteEventId: note.id,
          }),
        )
        continue
      }
      const boundaryAt = (timeSeconds: number) =>
        boundaryGeometryAtPlacement(
          field,
          boundary,
          fieldPlacementAt(composition, field, timeSeconds),
        )
      const lane = compileGateModulationLane({
        mapping,
        note,
        entry,
        exit,
        boundaryAt,
        stateAt: (timeSeconds) => {
          const state = headStateAt(composition, entry.headId, timeSeconds)
          return Object.freeze({
            timeSeconds,
            position: freezePoint(state.position),
            velocity: freezePoint(state.velocity),
          })
        },
        referenceDistance:
          composition.space.pitchReference ?? composition.space.scale,
        maxSamples: Math.min(
          gateModulationLimits.maxSamplesPerLane,
          Math.max(1, remainingSamples),
        ),
      })
      if (!lane) {
        diagnostics.push(
          Object.freeze({
            code: 'unsupported-source' as const,
            message: `Source "${mapping.source}" requires a positive-width wedge; no lane was emitted for note "${note.id}".`,
            partId: note.partId,
            mappingId: mapping.id,
            noteEventId: note.id,
          }),
        )
        continue
      }
      lanes.push(lane)
      totalSamples += lane.samples.length
      if (lane.truncated) {
        diagnostics.push(
          Object.freeze({
            code: 'sample-limit' as const,
            message: `Lane "${lane.id}" kept ${lane.samples.length} samples including entry and exit; later interior samples were dropped.`,
            partId: note.partId,
            mappingId: mapping.id,
            noteEventId: note.id,
          }),
        )
      }
    }
  }

  return Object.freeze({
    lanes: Object.freeze(lanes),
    diagnostics: Object.freeze(diagnostics),
  })
}
