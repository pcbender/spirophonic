import type {
  Composition,
  NotePartSpec,
  ScaleName,
} from './composition'
import { midiToFrequency, scaleIntervals } from './scales'
import { validateComposition } from './compositionValidation'
import {
  compileBoundaryEncounters,
  type BoundaryCrossingEncounter,
  type EncounterScanOptions,
} from './encounters'
import {
  buildPartMelody,
  mapEncounterPitch,
  normalizeEncounterContour,
  selectPartEncounters,
  validatePartMusicalRange,
  type InterpretableEncounter,
  type MappedPitch,
} from './parts'
import {
  compileControlLane,
  compileRelationEncounters,
  relationPairs,
  type ControlLane,
  type RelationEncounter,
} from './relations'
import {
  mapStrengthToVelocity,
  quantizeAbsoluteBeat,
} from './rhythm'
import {
  compileTraceEncounters,
  type TraceCrossingEncounter,
} from './traceEncounters'
import {
  applyInitialConditionVariation,
  interpretationVariationFor,
  performanceVariationFor,
  variationIsActive,
  type VariationTraceEntry,
} from './variation'
import {
  beatsToSeconds,
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
  /** Variation may silence a note without removing it from the layer. */
  rest: boolean
  probability: number
}>

export type PerformanceDiagnostic = Readonly<{
  severity: 'error' | 'warning'
  code:
    | 'invalid-composition'
    | 'invalid-performance-request'
    | 'invalid-musical-range'
    | 'mapping-error'
    | 'control-part'
    | 'encounter-scan'
    | 'relation-scan'
    | 'trace-scan'
  message: string
  path?: string
  partId?: string
  encounterId?: string
}>

export type CanonicalPerformance = Readonly<{
  compositionId: string
  request: Readonly<PerformanceRequest>
  encounters: ReadonlyArray<BoundaryCrossingEncounter>
  relationEncounters: ReadonlyArray<RelationEncounter>
  traceEncounters: ReadonlyArray<TraceCrossingEncounter>
  controlLanes: ReadonlyArray<ControlLane>
  interpretedEvents: ReadonlyArray<NoteMusicalEvent>
  performedEvents: ReadonlyArray<NoteMusicalEvent>
  /** Which variation rule changed which output value, and by how much. */
  variationTrace: ReadonlyArray<VariationTraceEntry>
  diagnostics: ReadonlyArray<PerformanceDiagnostic>
}>

export type PerformanceCompileOptions = EncounterScanOptions

type NoteCandidate = Readonly<{
  encounter: InterpretableEncounter
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

/**
 * Whether a performed event is heard or written out.
 *
 * A performed event is not automatically a sounding one. Interpretation
 * variation can silence a note while keeping it in the layer, so that it holds
 * its interpreted id and the variation trace can explain the difference. Every
 * consumer that turns events into sound or notation — the live scheduler, the
 * offline renderer, and the MIDI and Strudel exporters — must ask this rather
 * than assume the layer is uniformly audible.
 *
 * `rest` is the decision; `probability` records the roll that produced it and
 * is not consulted here, so one flag stays the single answer.
 */
export const eventSounds = (event: NoteMusicalEvent) => !event.rest

export const soundingEvents = (
  events: ReadonlyArray<NoteMusicalEvent>,
): ReadonlyArray<NoteMusicalEvent> => events.filter(eventSounds)

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
    relationEncounters: Object.freeze([]) as ReadonlyArray<RelationEncounter>,
    traceEncounters: Object.freeze([]) as ReadonlyArray<TraceCrossingEncounter>,
    controlLanes: Object.freeze([]) as ReadonlyArray<ControlLane>,
    interpretedEvents: emptyEvents,
    performedEvents: emptyEvents,
    variationTrace: Object.freeze([]) as ReadonlyArray<VariationTraceEntry>,
    diagnostics: Object.freeze([...diagnostics]),
  })
}

const compareEvents = (left: NoteMusicalEvent, right: NoteMusicalEvent) =>
  left.timeSeconds - right.timeSeconds ||
  compareText(left.partId, right.partId) ||
  compareText(left.sourceEncounterId, right.sourceEncounterId) ||
  compareText(left.id, right.id)

/**
 * Every Encounter a note Part may select, in one stream.
 *
 * Boundary crossings, trace crossings, and Relation events are scanned by three
 * separate compilers and were previously kept apart: only the boundary stream
 * reached interpretation, so a Part's `kinds` filter had nothing else to match
 * and the other two were computed, exposed on the performance, and never heard.
 *
 * The two non-boundary kinds carry no Boundary, so they present empty
 * `fieldId` and `boundaryId` — a Part filtering on a Field or Boundary
 * correctly selects none of them. For `boundaryIndex`, which is what
 * degree-based pitch reads, they use the index of the *other* Head. That keeps
 * the rule parallel: the degree is which countable thing was met, whether that
 * is the third ring or the third Head's Trace.
 */
const interpretableEncounters = (
  composition: Composition,
  boundary: ReadonlyArray<BoundaryCrossingEncounter>,
  trace: ReadonlyArray<TraceCrossingEncounter>,
  relations: ReadonlyArray<RelationEncounter>,
): ReadonlyArray<InterpretableEncounter> => {
  const headOrdinal = new Map<string, number>()
  composition.wheels.forEach((wheel) =>
    wheel.heads.forEach((head) => headOrdinal.set(head.id, headOrdinal.size)),
  )
  const ordinalOf = (headId: string) => headOrdinal.get(headId) ?? 0

  return Object.freeze([
    ...boundary,
    ...trace.map(
      (encounter): InterpretableEncounter =>
        Object.freeze({
          ...encounter,
          fieldId: '',
          boundaryId: '',
          boundaryIndex: ordinalOf(encounter.targetHeadId),
          boundaryKind: 'ring' as const,
          partnerWheelId: encounter.targetWheelId,
          partnerHeadId: encounter.targetHeadId,
        }),
    ),
    ...relations.map(
      (encounter): InterpretableEncounter =>
        Object.freeze({
          ...encounter,
          fieldId: '',
          boundaryId: '',
          boundaryIndex: ordinalOf(encounter.partnerHeadId),
          boundaryKind: 'ring' as const,
          // A Relation reports no incidence angle; it is not a crossing.
          incidenceAngle: 0,
        }),
    ),
  ])
}

const quantizedCandidates = (
  part: NotePartSpec,
  encounters: ReadonlyArray<InterpretableEncounter>,
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
  // A melodic line is stateful across the Part's Encounters, so it is built
  // once for the whole selection rather than per Encounter.
  const melody = buildPartMelody(part, encounters, composition.space)
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
            {
              composition,
              tuningContextId: part.tuningContextId,
              melodyMidiNote: melody?.[index],
            },
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
  allEncounters: ReadonlyArray<InterpretableEncounter>,
): number | undefined => {
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
      encounter.fieldId === candidate.encounter.fieldId &&
      encounter.boundaryId === candidate.encounter.boundaryId &&
      encounter.transition === 'exit',
  )
  if (!nextPhysical) return undefined
  const endBeat = nextPhysical.absoluteBeat

  return endBeat > candidate.absoluteBeat + 1e-9
    ? endBeat - candidate.absoluteBeat
    : undefined
}

/** Moves a MIDI note by scale degrees, or by semitones when there is no scale. */
const shiftMidiByScaleDegrees = (
  midiNote: number,
  degrees: number,
  scale: ScaleName | undefined,
) => {
  if (!scale) {
    return Math.min(127, Math.max(0, midiNote + degrees))
  }
  const intervals = scaleIntervals[scale]
  const size = intervals.length
  // Find the nearest degree the note already sits on, then step from there.
  let nearest = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < size; index += 1) {
    const distance = Math.abs(((midiNote % 12) + 12) % 12 - intervals[index])
    if (distance < bestDistance) {
      bestDistance = distance
      nearest = index
    }
  }
  const baseOctave = Math.floor(midiNote / 12)
  const target = nearest + degrees
  const octaveShift = Math.floor(target / size)
  const within = ((target % size) + size) % size
  return Math.min(
    127,
    Math.max(0, (baseOctave + octaveShift) * 12 + intervals[within]),
  )
}

const interpretNotePart = (
  part: NotePartSpec,
  composition: Composition,
  allEncounters: ReadonlyArray<InterpretableEncounter>,
  diagnostics: Array<PerformanceDiagnostic>,
  variationTrace: Array<VariationTraceEntry>,
) => {
  const selectedByQuery = selectPartEncounters(part, allEncounters)
  const usesRegionGate =
    part.duration.kind === 'inside-band' ||
    part.duration.kind === 'inside-region'
  const selectedEncounters = usesRegionGate
    ? selectedByQuery.filter((encounter) => encounter.transition === 'enter')
    : selectedByQuery
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

  const scaleForPart =
    part.pitch.kind === 'boundary-degree' ||
    part.pitch.kind === 'spatial' ||
    part.pitch.kind === 'contour'
      ? part.pitch.scale
      : part.pitch.kind === 'melodic-contour'
        ? part.pitch.scale
        : undefined

  return candidates.flatMap((candidate, index): Array<NoteMusicalEvent> => {
    const durationBeats = durationForCandidate(
      part,
      candidate,
      index,
      candidates,
      allEncounters,
    )
    if (durationBeats === undefined) {
      diagnostics.push(
        Object.freeze({
          severity: 'warning' as const,
          code: 'mapping-error' as const,
          message: `Region entry "${candidate.encounter.id}" has no later matching exit after quantization; no note was emitted.`,
          partId: part.id,
          encounterId: candidate.encounter.id,
        }),
      )
      return []
    }
    const timeSeconds = beatsToSeconds(
      candidate.absoluteBeat,
      composition.transport.tempoBpm,
    )
    const address = transportAddressAtSeconds(
      composition.transport,
      timeSeconds,
    )

    // Interpretation variation is scoped by Part and source Encounter, so a
    // Part's notes are unaffected by what other Parts exist.
    const interpretation = interpretationVariationFor(
      composition.variation,
      part.id,
      candidate.encounter.id,
      1,
    )
    variationTrace.push(...interpretation.trace)
    const shiftedMidi =
      candidate.pitch.midiNote === undefined || interpretation.degreeShift === 0
        ? candidate.pitch.midiNote
        : shiftMidiByScaleDegrees(
            candidate.pitch.midiNote,
            interpretation.degreeShift,
            scaleForPart,
          )
    const variedPitch =
      shiftedMidi === undefined || shiftedMidi === candidate.pitch.midiNote
        ? candidate.pitch
        : {
            midiNote: shiftedMidi,
            frequencyHz: midiToFrequency(shiftedMidi),
          }

    return [Object.freeze({
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
      ...(variedPitch.midiNote === undefined
        ? {}
        : { midiNote: variedPitch.midiNote }),
      frequencyHz: variedPitch.frequencyHz,
      velocity: candidate.velocity,
      durationBeats,
      durationSeconds: beatsToSeconds(
        durationBeats,
        composition.transport.tempoBpm,
      ),
      rest: !interpretation.sounds,
      probability: interpretation.sounds ? 1 : 0,
    })]
  })
}

export type InterpretationResult = Readonly<{
  events: ReadonlyArray<NoteMusicalEvent>
  controlLanes: ReadonlyArray<ControlLane>
  diagnostics: ReadonlyArray<PerformanceDiagnostic>
  variationTrace: ReadonlyArray<VariationTraceEntry>
}>

/**
 * Interprets a supplied set of Encounters through a Composition's Parts.
 *
 * compilePerformance calls this with Encounters it just derived from geometry.
 * MG-18 reinterpretation calls it with Encounters read back from a Recording,
 * which is why it takes them as an argument instead of computing them: the
 * Wheels and Fields that produced them may no longer exist.
 */
export const interpretEncounters = (
  composition: Composition,
  request: PerformanceRequest,
  encounters: ReadonlyArray<InterpretableEncounter>,
): InterpretationResult => {
  const diagnostics: Array<PerformanceDiagnostic> = []
  const variationTrace: Array<VariationTraceEntry> = []
  const events: Array<NoteMusicalEvent> = []
  const controlLanes: Array<ControlLane> = []
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
      // A Control Part drives a lane rather than notes. It needs a Head pair,
      // which it takes from the relation it selects, or from the first pair of
      // enabled Heads when it names none.
      const relation = (composition.relations ?? []).find(
        (candidate) =>
          part.encounterQuery.relationIds?.includes(candidate.id) ?? false,
      )
      const { pairs } = relationPairs(
        composition,
        relation ?? {
          id: `${part.id}-implicit`,
          name: part.name,
          enabled: true,
          kind: 'conjunction',
          headIds: part.encounterQuery.headIds,
          threshold: 1,
          hysteresis: 0,
          minSeparationSeconds: 0,
        },
      )
      const pair = pairs[0]

      if (!pair) {
        diagnostics.push(
          Object.freeze({
            severity: 'warning',
            code: 'control-part',
            message: `Control Part "${part.name}" needs two enabled Heads to measure; it produced no lane.`,
            partId: part.id,
          }),
        )
        continue
      }

      controlLanes.push(
        compileControlLane(
          composition,
          request,
          part,
          pair,
          relation?.threshold ?? 1,
        ),
      )
      continue
    }

    events.push(
      ...interpretNotePart(
        part,
        composition,
        encounters,
        diagnostics,
        variationTrace,
      ),
    )
  }


  return Object.freeze({
    events: Object.freeze([...events].sort(compareEvents)),
    controlLanes,
    diagnostics: Object.freeze(diagnostics),
    variationTrace: Object.freeze(variationTrace),
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

  // Initial-condition variation produces a varied Composition before any
  // geometry runs, so the compiler below never has to know about variation.
  const initial = applyInitialConditionVariation(compositionValidation.composition)
  const varied = initial.value
  const variationTrace: Array<VariationTraceEntry> = [...initial.trace]

  const encounterResult = compileBoundaryEncounters(
    varied,
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
  const relationResult = compileRelationEncounters(
    varied,
    requestValidation.request,
  )
  diagnostics.push(
    ...relationResult.diagnostics.map((diagnostic) =>
      Object.freeze({
        severity: 'warning' as const,
        code: 'relation-scan' as const,
        message: diagnostic.message,
      }),
    ),
  )
  const traceResult = compileTraceEncounters(
    varied,
    requestValidation.request,
  )
  diagnostics.push(
    ...traceResult.diagnostics.map((diagnostic) =>
      Object.freeze({
        severity: 'warning' as const,
        code: 'trace-scan' as const,
        message: diagnostic.message,
      }),
    ),
  )

  const interpretation = interpretEncounters(
    composition,
    request,
    interpretableEncounters(
      composition,
      encounterResult.encounters,
      traceResult.encounters,
      relationResult.encounters,
    ),
  )
  diagnostics.push(...interpretation.diagnostics)
  variationTrace.push(...interpretation.variationTrace)
  const events = [...interpretation.events]
  const controlLanes = interpretation.controlLanes

  const interpretedEvents = Object.freeze(events.sort(compareEvents))

  /**
   * The performed layer is the interpreted layer plus bounded deltas. Each
   * performed event keeps its interpreted id, so identity survives variation
   * and the trace explains every difference. With variation off the two layers
   * are the same array, which is what makes the disabled path exactly the
   * unvaried path rather than a re-derivation that happens to match.
   */
  const performedEvents = !variationIsActive(composition.variation)
    ? interpretedEvents
    : Object.freeze(
        interpretedEvents
          .map((event) => {
            const applied = performanceVariationFor(
              composition.variation,
              event.id,
            )
            variationTrace.push(...applied.trace)

            const absoluteBeat = event.absoluteBeat + applied.timingBeats
            const timeSeconds = beatsToSeconds(
              absoluteBeat,
              composition.transport.tempoBpm,
            )
            const address = transportAddressAtSeconds(
              composition.transport,
              timeSeconds,
            )
            const durationBeats = Math.max(
              1e-9,
              event.durationBeats * applied.durationScale,
            )

            return Object.freeze({
              ...event,
              timeSeconds,
              absoluteBeat,
              barIndex: address.barIndex,
              beatInBar: address.beatInBar,
              barPhase: address.barPhase,
              velocity: Math.min(
                127,
                Math.max(1, Math.round(event.velocity + applied.velocityDelta)),
              ),
              durationBeats,
              durationSeconds: beatsToSeconds(
                durationBeats,
                composition.transport.tempoBpm,
              ),
            })
          })
          .sort(compareEvents),
      )

  return Object.freeze({
    compositionId: composition.id,
    request: freezeRequest(requestValidation.request),
    encounters: encounterResult.encounters,
    relationEncounters: relationResult.encounters,
    traceEncounters: traceResult.encounters,
    controlLanes: Object.freeze(controlLanes),
    interpretedEvents,
    performedEvents,
    variationTrace: Object.freeze(variationTrace),
    diagnostics: Object.freeze(diagnostics),
  })
}
