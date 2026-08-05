import type { InstrumentSpec } from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'

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
