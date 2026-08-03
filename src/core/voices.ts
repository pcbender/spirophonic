import { generateCurvePoints } from './curves'
import { extractEvents } from './events'
import type { DrumVoice, SpirophonicModel } from './model'
import { shapeRhythm, type ShapedEvent } from './rhythm'

export type RenderedVoice = {
  voice: DrumVoice
  events: Array<ShapedEvent>
}

/**
 * Reads one voice's own curve and turns it into playable hits. Exporters take
 * the result rather than the geometry, so nothing downstream has to know how a
 * curve is drawn.
 */
export const renderVoice = (voice: DrumVoice): Array<ShapedEvent> =>
  shapeRhythm(
    extractEvents(generateCurvePoints({ geometry: voice.geometry }), voice.trigger),
    { quantize: voice.quantize, velocity: voice.velocity },
  )

export const renderVoices = (model: SpirophonicModel): Array<RenderedVoice> =>
  model.voices
    .filter((voice) => voice.enabled)
    .map((voice) => ({ voice, events: renderVoice(voice) }))
