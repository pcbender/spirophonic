import type {
  Composition,
  NotePartSpec,
} from './composition'
import { validateComposition } from './compositionValidation'
import {
  compileBoundaryEncounters,
  type BoundaryCrossingEncounter,
  type EncounterScanOptions,
} from './encounters'
import {
  mapEncounterPitch,
  normalizeEncounterContour,
  selectPartEncounters,
  validatePartMusicalRange,
  type MappedPitch,
} from './parts'
import {
  mapStrengthToVelocity,
  quantizeAbsoluteBeat,
} from './rhythm'
import {
  beatsToSeconds,
  secondsToBeats,
  transportAddressAtSeconds,
  validatePerformanceRequest,
  type PerformanceRequest,
} from './transport'

export type NoteMusicalEvent = Readonly<{
  id: string
  sourceEncounterId: string
  partId: string
  instrumentId: string
  kind: 'note'
  timeSeconds: number
  absoluteBeat: number
  barIndex: number
  beatInBar: number
  barPhase: number
  midiNote?: number
  frequencyHz: number
  velocity: number
  durationBeats: number
  durationSeconds: number
  rest: false
  probability: 1
}>

export type PerformanceDiagnostic = Readonly<{
  severity: 'error' | 'warning'
  code:
    | 'invalid-composition'
    | 'invalid-performance-request'
    | 'invalid-musical-range'
    | 'mapping-error'
    | 'deferred-control-part'
    | 'encounter-scan'
  message: string
  path?: string
  partId?: string
  encounterId?: string
}>

export type CanonicalPerformance = Readonly<{
  compositionId: string
  request: Readonly<PerformanceRequest>
  encounters: ReadonlyArray<BoundaryCrossingEncounter>
  interpretedEvents: ReadonlyArray<NoteMusicalEvent>
  performedEvents: ReadonlyArray<NoteMusicalEvent>
  diagnostics: ReadonlyArray<PerformanceDiagnostic>
}>

export type PerformanceCompileOptions = EncounterScanOptions

type NoteCandidate = Readonly<{
  encounter: BoundaryCrossingEncounter
  absoluteBeat: number
  pitch: MappedPitch
  velocity: number
}>

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

/**
 * Performance intent, layered over authoring intent. A disabled Part is inert
 * and cannot solo. Among enabled Parts, any solo restricts the mix to soloed
 * Parts; otherwise every unmuted Part sounds. This only selects which Parts
 * compile — it never rewrites geometry or Part configuration.
 */
export const audiblePartIds = (
  composition: Composition,
): ReadonlySet<string> => {
  const enabled = composition.parts.filter((part) => part.enabled)
  const soloed = enabled.filter((part) => part.solo)
  const audible = soloed.length > 0 ? soloed : enabled.filter((part) => !part.mute)

  return new Set(audible.map((part) => part.id))
}

const eventId = (partId: string, encounterId: string) =>
  ['musical-event', partId, encounterId].map(encodeURIComponent).join('/')

const freezeRequest = (request: PerformanceRequest): Readonly<PerformanceRequest> =>
  Object.freeze(
    request.seed === undefined ? { ...request } : { ...request, seed: request.seed },
  )

const emptyPerformance = (
  compositionId: string,
  request: PerformanceRequest,
  diagnostics: ReadonlyArray<PerformanceDiagnostic>,
): CanonicalPerformance => {
  const emptyEncounters = Object.freeze([]) as ReadonlyArray<BoundaryCrossingEncounter>
  const emptyEvents = Object.freeze([]) as ReadonlyArray<NoteMusicalEvent>

  return Object.freeze({
    compositionId,
    request: freezeRequest(request),
    encounters: emptyEncounters,
    interpretedEvents: emptyEvents,
    performedEvents: emptyEvents,
    diagnostics: Object.freeze([...diagnostics]),
  })
}

const compareEvents = (left: NoteMusicalEvent, right: NoteMusicalEvent) =>
  left.timeSeconds - right.timeSeconds ||
  compareText(left.partId, right.partId) ||
  compareText(left.sourceEncounterId, right.sourceEncounterId) ||
  compareText(left.id, right.id)

const quantizedCandidates = (
  part: NotePartSpec,
  encounters: ReadonlyArray<BoundaryCrossingEncounter>,
  composition: Composition,
  diagnostics: Array<PerformanceDiagnostic>,
): Array<NoteCandidate> => {
  const contour =
    part.pitch.kind === 'contour'
      ? normalizeEncounterContour(
          encounters,
          part.pitch.source,
          composition.space,
        )
      : undefined
  const candidates: Array<NoteCandidate> = []

  encounters.forEach((encounter, index) => {
    try {
      candidates.push(
        Object.freeze({
          encounter,
          absoluteBeat: part.quantize
            ? quantizeAbsoluteBeat(encounter.absoluteBeat, part.quantize)
            : encounter.absoluteBeat,
          pitch: mapEncounterPitch(
            encounter,
            part.pitch,
            composition.space,
            contour?.[index],
          ),
          velocity: mapStrengthToVelocity(encounter.strength, part.velocity),
        }),
      )
    } catch (error) {
      diagnostics.push(
        Object.freeze({
          severity: 'error',
          code: 'mapping-error',
          message: error instanceof Error ? error.message : String(error),
          partId: part.id,
          encounterId: encounter.id,
        }),
      )
    }
  })

  if (!part.quantize) return candidates

  const winners: Array<NoteCandidate & { slot: number }> = []
  for (const candidate of candidates) {
    const slot = Math.round(
      candidate.encounter.absoluteBeat / part.quantize.gridBeats,
    )
    const heldIndex = winners.findIndex((winner) => winner.slot === slot)

    if (heldIndex < 0) {
      winners.push({ ...candidate, slot })
      continue
    }

    const held = winners[heldIndex]
    if (
      candidate.encounter.strength > held.encounter.strength ||
      (candidate.encounter.strength === held.encounter.strength &&
        compareText(candidate.encounter.id, held.encounter.id) < 0)
    ) {
      winners[heldIndex] = { ...candidate, slot }
    }
  }

  return winners.map((winner) =>
    Object.freeze({
      encounter: winner.encounter,
      absoluteBeat: winner.absoluteBeat,
      pitch: winner.pitch,
      velocity: winner.velocity,
    }),
  )
}

const durationForCandidate = (
  part: NotePartSpec,
  candidate: NoteCandidate,
  index: number,
  selected: ReadonlyArray<NoteCandidate>,
  allEncounters: ReadonlyArray<BoundaryCrossingEncounter>,
  request: PerformanceRequest,
  composition: Composition,
) => {
  if (part.duration.kind === 'fixed') return part.duration.beats

  if (part.duration.kind === 'until-next') {
    const next = selected[index + 1]
    if (!next) return part.duration.maxBeats

    return Math.max(
      1e-9,
      Math.min(
        part.duration.maxBeats,
        next.absoluteBeat - candidate.absoluteBeat,
      ),
    )
  }

  const nextPhysical = allEncounters.find(
    (encounter) =>
      encounter.timeSeconds > candidate.encounter.timeSeconds &&
      encounter.wheelId === candidate.encounter.wheelId &&
      encounter.headId === candidate.encounter.headId &&
      encounter.fieldId === candidate.encounter.fieldId,
  )
  const endBeat = nextPhysical
    ? nextPhysical.absoluteBeat
    : secondsToBeats(
        request.startSeconds + request.durationSeconds,
        composition.transport.tempoBpm,
      )

  return Math.max(1e-9, endBeat - candidate.absoluteBeat)
}

const interpretNotePart = (
  part: NotePartSpec,
  composition: Composition,
  request: PerformanceRequest,
  allEncounters: ReadonlyArray<BoundaryCrossingEncounter>,
  diagnostics: Array<PerformanceDiagnostic>,
) => {
  const selectedEncounters = selectPartEncounters(part, allEncounters)
  const candidates = quantizedCandidates(
    part,
    selectedEncounters,
    composition,
    diagnostics,
  ).sort(
    (left, right) =>
      left.absoluteBeat - right.absoluteBeat ||
      compareText(left.encounter.id, right.encounter.id),
  )

  return candidates.map((candidate, index): NoteMusicalEvent => {
    const durationBeats = durationForCandidate(
      part,
      candidate,
      index,
      candidates,
      allEncounters,
      request,
      composition,
    )
    const timeSeconds = beatsToSeconds(
      candidate.absoluteBeat,
      composition.transport.tempoBpm,
    )
    const address = transportAddressAtSeconds(
      composition.transport,
      timeSeconds,
    )

    return Object.freeze({
      id: eventId(part.id, candidate.encounter.id),
      sourceEncounterId: candidate.encounter.id,
      partId: part.id,
      instrumentId: part.instrumentId,
      kind: 'note',
      timeSeconds,
      absoluteBeat: candidate.absoluteBeat,
      barIndex: address.barIndex,
      beatInBar: address.beatInBar,
      barPhase: address.barPhase,
      ...(candidate.pitch.midiNote === undefined
        ? {}
        : { midiNote: candidate.pitch.midiNote }),
      frequencyHz: candidate.pitch.frequencyHz,
      velocity: candidate.velocity,
      durationBeats,
      durationSeconds: beatsToSeconds(
        durationBeats,
        composition.transport.tempoBpm,
      ),
      rest: false,
      probability: 1,
    })
  })
}

export const compilePerformance = (
  composition: Composition,
  request: PerformanceRequest,
  options: PerformanceCompileOptions = {},
): CanonicalPerformance => {
  const diagnostics: Array<PerformanceDiagnostic> = []
  const compositionValidation = validateComposition(composition)
  const requestValidation = validatePerformanceRequest(request)

  if (!compositionValidation.ok) {
    diagnostics.push(
      ...compositionValidation.issues.map((issue) =>
        Object.freeze({
          severity: 'error' as const,
          code: 'invalid-composition' as const,
          path: issue.path,
          message: issue.message,
        }),
      ),
    )
  }
  if (!requestValidation.ok) {
    diagnostics.push(
      ...requestValidation.issues.map((issue) =>
        Object.freeze({
          severity: 'error' as const,
          code: 'invalid-performance-request' as const,
          path: issue.path,
          message: issue.message,
        }),
      ),
    )
  }
  if (!compositionValidation.ok || !requestValidation.ok) {
    return emptyPerformance(composition.id, request, diagnostics)
  }

  const encounterResult = compileBoundaryEncounters(
    compositionValidation.composition,
    requestValidation.request,
    options,
  )
  diagnostics.push(
    ...encounterResult.diagnostics.map((diagnostic) =>
      Object.freeze({
        severity: 'warning' as const,
        code: 'encounter-scan' as const,
        message: diagnostic.message,
      }),
    ),
  )

  const events: Array<NoteMusicalEvent> = []
  const audible = audiblePartIds(composition)
  const parts = composition.parts
    .map((part, partIndex) => ({ part, partIndex }))
    .sort((left, right) => compareText(left.part.id, right.part.id))

  for (const { part, partIndex } of parts) {
    if (!audible.has(part.id)) continue

    const rangeIssues = validatePartMusicalRange(
      part,
      `$.parts[${partIndex}]`,
    )
    if (rangeIssues.length > 0) {
      diagnostics.push(
        ...rangeIssues.map((issue) =>
          Object.freeze({
            severity: 'error' as const,
            code: 'invalid-musical-range' as const,
            path: issue.path,
            message: issue.message,
            partId: part.id,
          }),
        ),
      )
      continue
    }

    if (part.kind === 'control') {
      diagnostics.push(
        Object.freeze({
          severity: 'warning',
          code: 'deferred-control-part',
          message:
            'Continuous Control Part compilation is deferred to MG-14; the Part produced no events.',
          partId: part.id,
        }),
      )
      continue
    }

    events.push(
      ...interpretNotePart(
        part,
        composition,
        request,
        encounterResult.encounters,
        diagnostics,
      ),
    )
  }

  const interpretedEvents = Object.freeze(events.sort(compareEvents))

  return Object.freeze({
    compositionId: composition.id,
    request: freezeRequest(requestValidation.request),
    encounters: encounterResult.encounters,
    interpretedEvents,
    performedEvents: interpretedEvents,
    diagnostics: Object.freeze(diagnostics),
  })
}
