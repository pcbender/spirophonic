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
            title="Loop these parts through the browser to hear them."
            onClick={togglePreview}
          >
            {playing ? 'Stop' : 'Preview'}
          </button>
          <button
            type="button"
            title="Download these parts as a MIDI file for a DAW."
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
              <label className="voice-enable">
                <input
                  type="checkbox"
                  checked={voice.enabled}
                  onChange={(event) =>
                    updateVoice(voice.id, { enabled: event.target.checked })
                  }
                />
                <span>{voice.name}</span>
              </label>

              {voice.kind === 'percussion' ? (
                <label>
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
                <label>
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

              <label>
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

              <label>
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

              <label>
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

              <label>
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

              <output className="voice-count">{hits} hits</output>
            </li>
          )
        })}
      </ul>

      <output aria-live="polite">{status}</output>
    </section>
  )
}
