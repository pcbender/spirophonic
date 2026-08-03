import { useEffect, useMemo, useRef, useState } from 'react'

import { scaleNames, type ScaleName } from '../core/scales'

import type {
  CurveEventSource,
  CurveFamily,
  SpirophonicModel,
  Voice,
} from '../core/model'
import { curveFamilies } from '../core/curves'
import { previewPlan } from '../core/preview'
import { renderVoices } from '../core/voices'
import { VoicePreview } from '../audio/voicePreview'
import { buildMidiBytes, downloadMidiFile, gmPercussion } from '../export/midiExport'

type VoicePanelProps = {
  model: SpirophonicModel
  onChange: (model: SpirophonicModel) => void
}

const triggerLabels: Array<{ value: CurveEventSource; label: string }> = [
  { value: 'zero-x', label: 'Crosses x' },
  { value: 'zero-y', label: 'Crosses y' },
  { value: 'curvature', label: 'Cusps' },
  { value: 'radius-max', label: 'Petal tips' },
  { value: 'radius-min', label: 'Petal roots' },
]

const shapeLabels: Record<CurveFamily, string> = {
  spirogram: 'Spirogram',
  lissajous: 'Lissajous',
  rose: 'Rose',
  superformula: 'Superformula',
  harmonograph: 'Harmonograph',
}

/** An empty value means the voice reads whatever the main shape is. */
const INHERIT = ''

const drumOptions = Object.entries(gmPercussion).map(([name, note]) => ({
  name,
  note,
  label: name.replace(/-/g, ' '),
}))

export function VoicePanel({ model, onChange }: VoicePanelProps) {
  const [status, setStatus] = useState('')
  const [playing, setPlaying] = useState(false)
  const rendered = useMemo(() => renderVoices(model), [model])
  const plan = useMemo(() => previewPlan(model), [model])
  const previewRef = useRef<VoicePreview | null>(null)

  // Edits take effect at the next bar rather than restarting playback, so the
  // pattern can be shaped while it loops.
  useEffect(() => {
    if (playing) {
      previewRef.current?.update(plan, model.sound.waveform)
    }
  }, [model.sound.waveform, plan, playing])

  useEffect(
    () => () => {
      previewRef.current?.stop()
    },
    [],
  )

  const togglePreview = () => {
    if (!previewRef.current) {
      previewRef.current = new VoicePreview()
    }

    if (playing) {
      previewRef.current.stop()
      setPlaying(false)
      return
    }

    if (plan.hits.length === 0) {
      setStatus('Enable a voice first.')
      return
    }

    previewRef.current.start(plan, model.sound.waveform)
    setPlaying(true)
  }
  const totalHits = rendered.reduce((count, item) => count + item.notes.length, 0)

  const updateVoice = (id: string, patch: Partial<Voice>) => {
    onChange({
      ...model,
      voices: model.voices.map((voice) =>
        voice.id === id ? { ...voice, ...patch } : voice,
      ),
    })
  }

  const handleDownload = () => {
    if (rendered.length === 0) {
      setStatus('Enable a voice first.')
      return
    }

    const bytes = buildMidiBytes(
      rendered.map((item) => ({
        name: item.voice.name,
        channel: item.voice.channel,
        program: item.voice.program,
        steps: item.voice.quantize.divisions,
        gate: item.voice.gate,
        notes: item.notes,
      })),
      { cyclesPerSecond: model.time.cyclesPerSecond, name: model.name },
    )

    downloadMidiFile(bytes, model.name)
    setStatus(`Wrote ${totalHits} hits across ${rendered.length} tracks.`)
  }

  return (
    <section className="drum-panel" aria-label="Voices">
      <div className="panel-header">
        <h2>Voices</h2>
        <div className="panel-actions">
          <button
            type="button"
            aria-pressed={playing}
            title="Loop these parts through the browser to hear them. Synthesized here rather than sampled, so it is an audition: the MIDI file carries note numbers and your DAW decides the sound."
            onClick={togglePreview}
          >
            {playing ? 'Stop' : 'Preview'}
          </button>
          <button
            type="button"
            title="Download every enabled part as a MIDI file: one track each, four bars, at the tempo set by Speed. Percussion lands on channel 10, pitched parts on their own channel with a General MIDI program."
            onClick={handleDownload}
          >
            MIDI
          </button>
        </div>
      </div>

      <ul className="voice-list">
        {model.voices.map((voice) => {
          const hits =
            rendered.find((item) => item.voice.id === voice.id)?.notes.length ?? 0

          return (
            <li key={voice.id} className="voice-row">
              <div className="voice-head">
                <label
                  className="voice-enable"
                  title="Whether this part is played, exported, and drawn. Visually its curve and onset marks appear behind the main trace; sonically it joins the preview, the MIDI file, and the Strudel snippet."
                >
                  <input
                    type="checkbox"
                    checked={voice.enabled}
                    onChange={(event) =>
                      updateVoice(voice.id, { enabled: event.target.checked })
                    }
                  />
                  <span>{voice.name}</span>
                </label>
                <output className="voice-count">
                  {voice.enabled ? `${hits} hits` : 'off'}
                </output>
              </div>

              {voice.kind === 'percussion' ? (
                <label title="Which General MIDI drum this part plays. Sonically the sound of every hit; visually nothing. Written to MIDI as a note number on channel 10, and to Strudel as a sample name.">
                  <span>Drum</span>
                  <select
                    value={voice.note}
                    onChange={(event) =>
                      updateVoice(voice.id, { note: Number(event.target.value) })
                    }
                  >
                    {drumOptions.map((option) => (
                      <option key={option.name} value={option.note}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label title="The scale this pitched part is snapped to. Sonically it decides which notes exist; the curve then chooses among them, so the melody stays in key however the shape changes.">
                  <span>Scale</span>
                  <select
                    value={voice.pitch.scale}
                    onChange={(event) =>
                      updateVoice(voice.id, {
                        pitch: {
                          ...voice.pitch,
                          scale: event.target.value as ScaleName,
                        },
                      })
                    }
                  >
                    {scaleNames.map((name) => (
                      <option key={name} value={name}>
                        {name.replace(/-/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label title="The curve this part reads. Main shape uses the trace on screen, so what you see is what you hear. Any other choice gives this part its own family while it still inherits phase, speed, and samples from the main shape.">
                <span>Shape</span>
                <select
                  value={voice.geometry.family ?? INHERIT}
                  onChange={(event) => {
                    const { family, ...rest } = voice.geometry
                    const chosen = event.target.value

                    void family
                    updateVoice(voice.id, {
                      geometry:
                        chosen === INHERIT
                          ? rest
                          : { ...rest, family: chosen as CurveFamily },
                    })
                  }}
                >
                  <option value={INHERIT}>Main shape</option>
                  {curveFamilies.map((family) => (
                    <option key={family} value={family}>
                      {shapeLabels[family]}
                    </option>
                  ))}
                </select>
              </label>

              <label title="What on the curve fires a note: crossing the centre line, turning a sharp corner, or reaching a petal tip or root. Visually the dots marked on this part's trace; sonically the rhythm itself. Two parts triggered on different axes of one curve give a polyrhythm.">
                <span>Trigger</span>
                <select
                  value={voice.trigger.source}
                  onChange={(event) =>
                    updateVoice(voice.id, {
                      trigger: {
                        ...voice.trigger,
                        source: event.target.value as CurveEventSource,
                      },
                    })
                  }
                >
                  {triggerLabels.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label title="How firmly onsets are pulled onto an even grid of sixteenths. At the left they stay where the curve put them, which can swing or sit slightly off the beat; at the right they lock to it. Visually the onset marks slide toward even spacing around the curve. One step holds one hit, so tightening can also merge two close hits into the louder of the pair.">
                <span>Grid</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={voice.quantize.strength}
                  onChange={(event) =>
                    updateVoice(voice.id, {
                      quantize: {
                        ...voice.quantize,
                        strength: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              <label title="How long each note rings, counted in grid steps. 1 keeps every note inside its own step; above 1 they overlap, so a line of single notes becomes a chord. Sonically only. Goes to MIDI as note length and to Strudel as clip().">
                <span>Hold</span>
                <input
                  type="number"
                  min={0.25}
                  max={16}
                  step={0.25}
                  value={voice.gate}
                  onChange={(event) =>
                    updateVoice(voice.id, {
                      gate: Math.max(0.25, Number(event.target.value) || 1),
                    })
                  }
                />
              </label>
            </li>
          )
        })}
      </ul>

      <output aria-live="polite">{status}</output>
    </section>
  )
}
