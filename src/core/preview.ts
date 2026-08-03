import type { SpirophonicModel } from './model'
import { noteLengths } from './rhythm'
import { getEffectiveCyclesPerSecond } from './time'
import { renderVoices } from './voices'

export type PreviewHit = {
  voiceId: string
  kind: 'percussion' | 'pitched'
  /** Seconds from the start of the bar. */
  offset: number
  /** Seconds the note is held. */
  duration: number
  note: number
  /** 0..1, from the event's MIDI velocity. */
  level: number
}

export type PreviewPlan = {
  barSeconds: number
  hits: Array<PreviewHit>
}

/**
 * One bar of the composition as sounds and times, with no audio API in sight.
 *
 * The preview is a fourth adapter over the same events the MIDI and Strudel
 * exports read, and it shares noteLengths with them, so what you hear is what
 * they write rather than a second interpretation of the model.
 */
export const previewPlan = (model: SpirophonicModel): PreviewPlan => {
  const barSeconds = 1 / getEffectiveCyclesPerSecond(model.time.cyclesPerSecond)
  const hits = renderVoices(model).flatMap(({ voice, notes }) => {
    const lengths = noteLengths(notes, {
      steps: voice.quantize.divisions,
      gate: voice.gate,
    })

    return notes.map((note, index) => ({
      voiceId: voice.id,
      kind: voice.kind,
      offset: note.t * barSeconds,
      duration: lengths[index] * barSeconds,
      note: note.note,
      level: note.velocity / 127,
    }))
  })

  return { barSeconds, hits: hits.sort((left, right) => left.offset - right.offset) }
}
