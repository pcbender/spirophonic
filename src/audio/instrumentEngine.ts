import type { InstrumentSpec } from '../core/composition'
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
}>

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
  ): void
  cancelScheduledFrom(audioTimeSeconds: number): void
  panic(audioTimeSeconds: number): void
  dispose(): Promise<void>
}
