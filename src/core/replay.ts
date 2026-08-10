import type { PartSpec } from './composition'
import type { NoteMusicalEvent, PerformanceDiagnostic } from './performance'
import type { GateModulationLane } from './gateModulation'
import { interpretEncounters } from './performance'
import type { Recording } from './recording'
import { provenanceWarnings } from './recording'

/**
 * Replay and reinterpretation.
 *
 * This module deliberately imports no Wheel, Head, Field, Trace, or Encounter
 * *engine* module. It reads Encounters that a Recording already holds and never
 * evaluates geometry, which is what allows a Recording to play after the
 * Wheels and Fields that produced it are gone.
 */

export type ReplayResult = Readonly<{
  events: ReadonlyArray<NoteMusicalEvent>
  modulationLanes: ReadonlyArray<GateModulationLane>
  warnings: ReadonlyArray<string>
}>

/**
 * Exact replay: the recorded performed layer, untouched.
 *
 * Seeded variation is not rerolled, because nothing is recomputed. The captured
 * result is the result.
 */
export const replayRecording = (recording: Recording): ReplayResult => {
  const warnings = provenanceWarnings(recording).map((item) => item.message)
  const truncations = recording.truncations.map((item) => item.message)

  return Object.freeze({
    events: recording.performedEvents,
    modulationLanes: recording.modulationLanes,
    warnings: Object.freeze([...warnings, ...truncations]),
  })
}

export type ReinterpretationResult = Readonly<{
  events: ReadonlyArray<NoteMusicalEvent>
  modulationLanes: ReadonlyArray<GateModulationLane>
  diagnostics: ReadonlyArray<PerformanceDiagnostic>
  warnings: ReadonlyArray<string>
}>

/**
 * Reinterprets the recorded Encounters through a different Part set.
 *
 * The Encounters are physical facts and are passed through untouched: their
 * ids, positions, and measurements are exactly what was recorded. Only the
 * musical reading of them changes.
 */
export const reinterpretRecording = (
  recording: Recording,
  parts: ReadonlyArray<PartSpec>,
): ReinterpretationResult => {
  const composition = { ...recording.composition, parts: [...parts] }
  const interpretation = interpretEncounters(
    composition,
    recording.request,
    recording.encounters,
  )
  const warnings = provenanceWarnings(recording).map((item) => item.message)

  return Object.freeze({
    events: interpretation.events,
    modulationLanes: interpretation.modulationLanes,
    diagnostics: interpretation.diagnostics,
    warnings: Object.freeze([
      ...warnings,
      ...recording.truncations.map((item) => item.message),
    ]),
  })
}
