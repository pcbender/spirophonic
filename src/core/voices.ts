import { generateCurvePoints } from './curves'
import { extractEvents, normalize } from './events'
import type { PitchSource, SpirophonicModel, Voice } from './model'
import { shapeRhythm, type ShapedEvent } from './rhythm'
import { quantizeToScale } from './scales'
import type { SpiroPoint } from './trochoid'

export type VoiceNote = ShapedEvent & {
  /** MIDI note number for this hit. */
  note: number
}

export type RenderedVoice = {
  voice: Voice
  points: Array<SpiroPoint>
  notes: Array<VoiceNote>
}

export const percussionChannel = 9

/** The main shape with this voice's changes applied on top. */
export const voiceGeometry = (
  base: SpirophonicModel['geometry'],
  voice: Voice,
): SpirophonicModel['geometry'] => ({ ...base, ...voice.geometry })

/**
 * Reads a voice's resolved curve and turns it into playable notes. Exporters
 * take the result rather than the geometry, so nothing downstream has to know
 * how a curve is drawn.
 */
export const renderVoice = (
  voice: Voice,
  base: SpirophonicModel['geometry'],
): RenderedVoice => {
  const points = generateCurvePoints({ geometry: voiceGeometry(base, voice) })
  const events = shapeRhythm(extractEvents(points, voice.trigger), {
    quantize: voice.quantize,
    velocity: voice.velocity,
  })

  return { voice, points, notes: events.map(noteFor(voice, points)) }
}

export const renderVoices = (model: SpirophonicModel): Array<RenderedVoice> =>
  model.voices
    .filter((voice) => voice.enabled)
    .map((voice) => renderVoice(voice, model.geometry))

/**
 * Percussion holds one drum for the whole part. A pitched voice reads the
 * curve where each onset landed, so the shape that placed the note also
 * chooses it, and the result is snapped onto the voice's scale.
 */
const noteFor =
  (voice: Voice, points: Array<SpiroPoint>) =>
  (event: ShapedEvent): VoiceNote => {
    if (voice.kind === 'percussion') {
      return { ...event, note: voice.note }
    }

    const field = pitchField(points, voice.pitch.source)
    const reach = Math.max(0, voice.pitch.octaves) * 12
    const raw = voice.pitch.root + field[Math.min(event.index, field.length - 1)] * reach

    return {
      ...event,
      note: quantizeToScale(raw, voice.pitch.scale, voice.pitch.root),
    }
  }

const pitchField = (points: Array<SpiroPoint>, source: PitchSource) => {
  const unique = points.slice(0, Math.max(1, points.length - 1))

  if (source === 'angle') {
    // The winding angle is already periodic, so it is mapped directly rather
    // than min-max normalized, which would depend on where the curve started.
    return unique.map((point) => (((point.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2))
  }

  return normalize(
    unique.map((point) =>
      source === 'x' ? point.x : source === 'y' ? point.y : point.radius,
    ),
  )
}
