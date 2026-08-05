import type {
  Composition,
  EncounterDirection,
  Point2,
  TransportSpec,
} from './composition'
import {
  scanBoundaryCrossings,
  type CrossingRefinementOptions,
  type CrossingScanDiagnostic,
  type TimedPathPoint,
} from './crossings'
import {
  activeBoundaryGeometries,
  type BoundaryGeometry,
} from './fields'
import { headStateAt } from './heads'
import {
  iterateTimeGrid,
  normalizeCycleRate,
  normalizeTransport,
  transportAddressAtSeconds,
  type PerformanceRequest,
} from './transport'

export type BoundaryEncounterDirection = Extract<
  EncounterDirection,
  'inward' | 'outward' | 'clockwise' | 'counterclockwise'
>

export type BoundaryCrossingEncounter = Readonly<{
  id: string
  kind: 'boundary-crossing'
  timeSeconds: number
  subjectIds: readonly [string, string]
  wheelId: string
  headId: string
  fieldId: string
  boundaryId: string
  boundaryIndex: number
  boundaryKind: BoundaryGeometry['kind']
  position: Readonly<Point2>
  direction: BoundaryEncounterDirection
  strength: number
  speed: number
  incidenceAngle: number
  wheelPhase: number
  absoluteBeat: number
  barIndex: number
  beatInBar: number
  barPhase: number
}>

export type EncounterPathState = TimedPathPoint &
  Readonly<{
    velocity: Readonly<Point2>
    wheelPhase: number
  }>

export type EncounterDiagnostic = Readonly<{
  code:
    | CrossingScanDiagnostic['code']
    | 'low-sample-rate'
    | 'maximum-encounter-count'
  message: string
  wheelId?: string
  headId?: string
  fieldId?: string
  boundaryId?: string
  intervalStartSeconds?: number
  intervalEndSeconds?: number
}>

export type EncounterScanResult = Readonly<{
  encounters: ReadonlyArray<BoundaryCrossingEncounter>
  diagnostics: ReadonlyArray<EncounterDiagnostic>
}>

export type BoundaryEncounterPath = Readonly<{
  transport: TransportSpec
  wheelId: string
  headId: string
  boundary: BoundaryGeometry
  sampleTimes: ReadonlyArray<number>
  stateAt: (timeSeconds: number) => EncounterPathState
}>

export type EncounterScanOptions = CrossingRefinementOptions &
  Readonly<{
    maxEncounters?: number
    minimumSamplesPerWheelCycle?: number
  }>

export const encounterScanDefaults = Object.freeze({
  maxEncounters: 10_000,
  minimumSamplesPerWheelCycle: 64,
})

const epsilon = 1e-12

const freezePoint = (value: Readonly<Point2>): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

export const compareBoundaryEncounters = (
  left: BoundaryCrossingEncounter,
  right: BoundaryCrossingEncounter,
) =>
  left.timeSeconds - right.timeSeconds ||
  compareText(left.wheelId, right.wheelId) ||
  compareText(left.headId, right.headId) ||
  compareText(left.fieldId, right.fieldId) ||
  compareText(left.boundaryId, right.boundaryId) ||
  compareText(left.id, right.id)

export const sortBoundaryEncounters = (
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
): ReadonlyArray<BoundaryCrossingEncounter> =>
  Object.freeze([...encounters].sort(compareBoundaryEncounters))

const assertEncounterState = (
  state: EncounterPathState,
  expectedTime: number,
) => {
  if (
    state.timeSeconds !== expectedTime ||
    !Number.isFinite(state.position.x) ||
    !Number.isFinite(state.position.y) ||
    !Number.isFinite(state.velocity.x) ||
    !Number.isFinite(state.velocity.y) ||
    !Number.isFinite(state.wheelPhase)
  ) {
    throw new RangeError(
      'An Encounter path evaluator must return the requested time and finite state.',
    )
  }
}

const boundaryNormal = (
  boundary: BoundaryGeometry,
  position: Readonly<Point2>,
): Readonly<Point2> => {
  if (boundary.kind === 'spoke') {
    return freezePoint({
      x: -Math.sin(boundary.angle),
      y: Math.cos(boundary.angle),
    })
  }

  const x = position.x - boundary.center.x
  const y = position.y - boundary.center.y
  const length = Math.hypot(x, y)

  return length <= epsilon
    ? freezePoint({ x: 1, y: 0 })
    : freezePoint({ x: x / length, y: y / length })
}

const encounterId = (
  wheelId: string,
  headId: string,
  fieldId: string,
  boundaryId: string,
  timeSeconds: number,
) =>
  [
    'boundary-crossing',
    wheelId,
    headId,
    fieldId,
    boundaryId,
    timeSeconds.toFixed(9),
  ]
    .map(encodeURIComponent)
    .join('/')

const mapCrossingDiagnostic = (
  diagnostic: CrossingScanDiagnostic,
  wheelId: string,
  headId: string,
): EncounterDiagnostic =>
  Object.freeze({
    code: diagnostic.code,
    message: diagnostic.message,
    wheelId,
    headId,
    fieldId: diagnostic.fieldId,
    boundaryId: diagnostic.boundaryId,
    intervalStartSeconds: diagnostic.intervalStartSeconds,
    intervalEndSeconds: diagnostic.intervalEndSeconds,
  })

export const boundaryEncountersForPath = (
  input: BoundaryEncounterPath,
  options: CrossingRefinementOptions = {},
): EncounterScanResult => {
  const stateCache = new Map<number, EncounterPathState>()
  const stateAt = (timeSeconds: number) => {
    const cached = stateCache.get(timeSeconds)
    if (cached) return cached

    const state = input.stateAt(timeSeconds)
    assertEncounterState(state, timeSeconds)
    stateCache.set(timeSeconds, state)
    return state
  }
  const scan = scanBoundaryCrossings(
    input.boundary,
    input.sampleTimes,
    stateAt,
    options,
  )
  const encounters = scan.crossings.map((crossing) => {
    const state = stateAt(crossing.timeSeconds)
    const normal = boundaryNormal(input.boundary, crossing.position)
    const speed = Math.hypot(state.velocity.x, state.velocity.y)
    const normalSpeed =
      state.velocity.x * normal.x + state.velocity.y * normal.y
    const incidenceRatio =
      speed <= epsilon
        ? 0
        : Math.min(1, Math.max(0, Math.abs(normalSpeed) / speed))
    const direction: BoundaryEncounterDirection =
      input.boundary.kind === 'ring'
        ? crossing.toDistance > crossing.fromDistance
          ? 'outward'
          : 'inward'
        : crossing.toDistance > crossing.fromDistance
          ? 'counterclockwise'
          : 'clockwise'
    const address = transportAddressAtSeconds(
      input.transport,
      crossing.timeSeconds,
    )

    return Object.freeze({
      id: encounterId(
        input.wheelId,
        input.headId,
        crossing.fieldId,
        crossing.boundaryId,
        crossing.timeSeconds,
      ),
      kind: 'boundary-crossing' as const,
      timeSeconds: crossing.timeSeconds,
      subjectIds: Object.freeze([input.wheelId, input.headId] as const),
      wheelId: input.wheelId,
      headId: input.headId,
      fieldId: crossing.fieldId,
      boundaryId: crossing.boundaryId,
      boundaryIndex: input.boundary.index,
      boundaryKind: input.boundary.kind,
      position: freezePoint(crossing.position),
      direction,
      strength: incidenceRatio,
      speed,
      incidenceAngle: Math.acos(incidenceRatio),
      wheelPhase: state.wheelPhase,
      absoluteBeat: address.absoluteBeat,
      barIndex: address.barIndex,
      beatInBar: address.beatInBar,
      barPhase: address.barPhase,
    })
  })

  return Object.freeze({
    encounters: sortBoundaryEncounters(encounters),
    diagnostics: Object.freeze(
      scan.diagnostics.map((diagnostic) =>
        mapCrossingDiagnostic(diagnostic, input.wheelId, input.headId),
      ),
    ),
  })
}

const normalizeEngineOptions = (options: EncounterScanOptions) => {
  const maxEncounters =
    options.maxEncounters ?? encounterScanDefaults.maxEncounters
  const minimumSamplesPerWheelCycle =
    options.minimumSamplesPerWheelCycle ??
    encounterScanDefaults.minimumSamplesPerWheelCycle

  if (!Number.isInteger(maxEncounters) || maxEncounters < 1) {
    throw new RangeError('maxEncounters must be a positive integer.')
  }
  if (
    !Number.isFinite(minimumSamplesPerWheelCycle) ||
    minimumSamplesPerWheelCycle <= 0
  ) {
    throw new RangeError(
      'minimumSamplesPerWheelCycle must be finite and positive.',
    )
  }

  return { maxEncounters, minimumSamplesPerWheelCycle }
}

export const compileBoundaryEncounters = (
  composition: Composition,
  request: PerformanceRequest,
  options: EncounterScanOptions = {},
): EncounterScanResult => {
  const engineOptions = normalizeEngineOptions(options)
  const sampleTimes = [...iterateTimeGrid(request)]
  const transport = normalizeTransport(composition.transport)
  const diagnostics: Array<EncounterDiagnostic> = []
  const encounters: Array<BoundaryCrossingEncounter> = []
  const boundaries = [...activeBoundaryGeometries(composition)].sort(
    (left, right) =>
      compareText(left.fieldId, right.fieldId) ||
      compareText(left.boundaryId, right.boundaryId),
  )
  const subjects = composition.wheels
    .filter((wheel) => wheel.enabled)
    .flatMap((wheel) =>
      wheel.heads
        .filter((head) => head.enabled)
        .map((head) => ({ wheel, head })),
    )
    .sort(
      (left, right) =>
        compareText(left.wheel.id, right.wheel.id) ||
        compareText(left.head.id, right.head.id),
    )

  for (const wheel of composition.wheels
    .filter((candidate) => candidate.enabled)
    .sort((left, right) => compareText(left.id, right.id))) {
    const rate = normalizeCycleRate(wheel.rate)
    const cyclesPerSecond =
      (rate.cycles / rate.beats) * (transport.tempoBpm / 60)
    const samplesPerWheelCycle = request.sampleRateHz / cyclesPerSecond

    if (
      samplesPerWheelCycle < engineOptions.minimumSamplesPerWheelCycle
    ) {
      diagnostics.push(
        Object.freeze({
          code: 'low-sample-rate',
          message: `Wheel "${wheel.id}" has ${samplesPerWheelCycle.toFixed(3)} samples per cycle; at least ${engineOptions.minimumSamplesPerWheelCycle} are recommended for crossing convergence.`,
          wheelId: wheel.id,
        }),
      )
    }
  }

  let reachedMaximum = false

  scanSubjects: for (const { wheel, head } of subjects) {
    const stateCache = new Map<number, EncounterPathState>()
    const stateAt = (timeSeconds: number): EncounterPathState => {
      const cached = stateCache.get(timeSeconds)
      if (cached) return cached

      const state = headStateAt(composition, head.id, timeSeconds)
      const encounterState = Object.freeze({
        timeSeconds,
        position: freezePoint(state.position),
        velocity: freezePoint(state.velocity),
        wheelPhase: state.wheelPhase,
      })
      stateCache.set(timeSeconds, encounterState)
      return encounterState
    }

    for (const boundary of boundaries) {
      const result = boundaryEncountersForPath(
        {
          transport,
          wheelId: wheel.id,
          headId: head.id,
          boundary,
          sampleTimes,
          stateAt,
        },
        options,
      )
      diagnostics.push(...result.diagnostics)

      for (const encounter of result.encounters) {
        encounters.push(encounter)
        if (encounters.length > engineOptions.maxEncounters) {
          reachedMaximum = true
          break scanSubjects
        }
      }
    }
  }

  const sorted = sortBoundaryEncounters(encounters).slice(
    0,
    engineOptions.maxEncounters,
  )

  if (reachedMaximum) {
    diagnostics.push(
      Object.freeze({
        code: 'maximum-encounter-count',
        message: `Encounter compilation stopped at the configured maximum of ${engineOptions.maxEncounters}.`,
      }),
    )
  }

  return Object.freeze({
    encounters: Object.freeze(sorted),
    diagnostics: Object.freeze(diagnostics),
  })
}
