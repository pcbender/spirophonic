import { useMemo, useState } from 'react'

import type { CurveEventSource, DrumVoice, SpirophonicModel } from '../core/model'
import { renderVoices } from '../core/voices'
import {
  buildMidiBytes,
  downloadMidiFile,
  gmPercussion,
  percussionChannel,
} from '../export/midiExport'

type DrumPanelProps = {
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

const drumOptions = Object.entries(gmPercussion).map(([name, note]) => ({
  name,
  note,
  label: name.replace(/-/g, ' '),
}))

export function DrumPanel({ model, onChange }: DrumPanelProps) {
  const [status, setStatus] = useState('')
  const rendered = useMemo(() => renderVoices(model), [model])
  const totalHits = rendered.reduce((count, item) => count + item.events.length, 0)

  const updateVoice = (id: string, patch: Partial<DrumVoice>) => {
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
        channel: percussionChannel,
        note: item.voice.note,
        events: item.events,
      })),
      { cyclesPerSecond: model.time.cyclesPerSecond, name: model.name },
    )

    downloadMidiFile(bytes, model.name)
    setStatus(`Wrote ${totalHits} hits across ${rendered.length} tracks.`)
  }

  return (
    <section className="drum-panel" aria-label="Drum kit">
      <div className="panel-header">
        <h2>Drums</h2>
        <button
          type="button"
          title="Download these parts as a MIDI file for a DAW."
          onClick={handleDownload}
        >
          MIDI
        </button>
      </div>

      <ul className="voice-list">
        {model.voices.map((voice) => {
          const hits =
            rendered.find((item) => item.voice.id === voice.id)?.events.length ?? 0

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

              <output className="voice-count">{hits} hits</output>
            </li>
          )
        })}
      </ul>

      <output aria-live="polite">{status}</output>
    </section>
  )
}
