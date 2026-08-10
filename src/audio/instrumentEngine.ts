import type { InstrumentSpec } from '../core/composition'
import type {
  GateModulationLane,
  GateModulationSample,
} from '../core/gateModulation'
import type { NoteMusicalEvent } from '../core/performance'

/**
 * A context an engine can build voices in and drive.
 *
 * Live playback uses an `AudioContext`; offline render uses an
 * `OfflineAudioContext`, which is a `BaseAudioContext` and therefore has no
 * `close()` and no meaningful `suspend()`. Both are accepted here, and the
 * lifecycle methods are optional so engines must check for them rather than
 * assume a live context.
 */
export type RenderContext = BaseAudioContext &
  Readonly<{
    resume?: () => Promise<void>
    suspend?: () => Promise<void>
    close?: () => Promise<void>
  }>

export type ScheduledAudioVoice = Readonly<{
  startsAtSeconds: number
  endsAtSeconds: number
  cancel: (atSeconds: number) => void
  scheduleModulation?: (
    lanes: ReadonlyArray<ScheduledModulationLane>,
  ) => ReadonlyArray<InstrumentAutomationDiagnostic>
  cancelModulationFrom?: (atSeconds: number) => void
}>

export type ScheduledModulationSample = Readonly<{
  audioTimeSeconds: number
  value: GateModulationSample['value']
}>

/** One canonical note lane translated onto an engine's absolute clock. */
export type ScheduledModulationLane = Readonly<{
  id: string
  mappingId: string
  noteEventId: string
  partId: string
  instrumentId: string
  target: GateModulationLane['target']
  minimum: number
  maximum: number
  entryOnly: boolean
  samples: ReadonlyArray<ScheduledModulationSample>
}>

export type InstrumentAutomationDiagnostic = Readonly<{
  code: 'unsupported-target' | 'range-limit' | 'polyphony-limit'
  consumer: 'native' | 'soundfont'
  target: GateModulationLane['target']
  laneId: string
  noteEventId: string
  partId: string
  instrumentId: string
  message: string
}>

const epsilon = 1e-9

/**
 * Places canonical lane samples on an audio clock for one note occurrence.
 *
 * A seek into the middle keeps the original entry-only value, holds the last
 * continuous value at the resume point, and schedules only the remaining
 * samples. Motion after note-on can therefore never rewrite attack or initial
 * velocity retrospectively.
 */
export const scheduledModulationForOccurrence = (
  lanes: ReadonlyArray<GateModulationLane>,
  noteEventId: string,
  audioTimeSeconds: number,
  resumeTimelineSeconds: number,
): ReadonlyArray<ScheduledModulationLane> =>
  Object.freeze(
    lanes
      .filter((lane) => lane.noteEventId === noteEventId)
      .map((lane) => {
        if (lane.entryOnly) {
          const entry = lane.samples[0]
          return Object.freeze({
            id: lane.id,
            mappingId: lane.mappingId,
            noteEventId: lane.noteEventId,
            partId: lane.partId,
            instrumentId: lane.instrumentId,
            target: lane.target,
            minimum: lane.minimum,
            maximum: lane.maximum,
            entryOnly: true,
            samples: Object.freeze(
              entry
                ? [
                    Object.freeze({
                      audioTimeSeconds,
                      value: entry.value,
                    }),
                  ]
                : [],
            ),
          })
        }

        const before = [...lane.samples]
          .reverse()
          .find(
            (sample) =>
              sample.timeSeconds <= resumeTimelineSeconds + epsilon,
          )
        const after = lane.samples.filter(
          (sample) => sample.timeSeconds > resumeTimelineSeconds + epsilon,
        )
        const samples = [
          ...(before
            ? [
                Object.freeze({
                  audioTimeSeconds,
                  value: before.value,
                }),
              ]
            : []),
          ...after.map((sample) =>
            Object.freeze({
              audioTimeSeconds:
                audioTimeSeconds +
                sample.timeSeconds -
                resumeTimelineSeconds,
              value: sample.value,
            }),
          ),
        ]
        return Object.freeze({
          id: lane.id,
          mappingId: lane.mappingId,
          noteEventId: lane.noteEventId,
          partId: lane.partId,
          instrumentId: lane.instrumentId,
          target: lane.target,
          minimum: lane.minimum,
          maximum: lane.maximum,
          entryOnly: false,
          samples: Object.freeze(samples),
        })
      }),
  )

/**
 * Replaceable live-performance boundary. The scheduler owns musical time;
 * engines receive exact audio-clock timestamps and own rendering/cancellation.
 */
export interface InstrumentEngine {
  readonly currentTimeSeconds: number

  resume(): Promise<void>
  suspend(): Promise<void>
  schedule(
    event: NoteMusicalEvent,
    instrument: InstrumentSpec,
    audioTimeSeconds: number,
    lanes?: ReadonlyArray<ScheduledModulationLane>,
  ): unknown
  cancelScheduledFrom(audioTimeSeconds: number): void
  panic(audioTimeSeconds: number): void
  dispose(): Promise<void>
}
