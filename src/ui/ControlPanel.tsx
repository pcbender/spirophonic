import type { Composition, MeterSpec } from '../core/composition'
import { RailPanel } from './RailPanel'

export type ControlPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

export function ControlPanel({ composition, onChange }: ControlPanelProps) {
  const updateTransport = (patch: Partial<Composition['transport']>) =>
    onChange({
      ...composition,
      transport: { ...composition.transport, ...patch },
    })

  return (
    <RailPanel label="Composition controls" title="Composition">
      <label className="field">
        <span>Name</span>
        <input
          aria-label="Composition name"
          value={composition.name}
          onChange={(event) =>
            onChange({ ...composition, name: event.currentTarget.value })
          }
        />
      </label>

      <h2>Transport</h2>
      <NumberField
        label="Tempo (BPM)"
        value={composition.transport.tempoBpm}
        min={20}
        max={400}
        step={1}
        onChange={(tempoBpm) => updateTransport({ tempoBpm })}
      />
      <NumberField
        label="Beats per bar"
        value={composition.transport.meter.beatsPerBar}
        min={1}
        max={32}
        step={1}
        onChange={(beatsPerBar) =>
          updateTransport({
            meter: {
              ...composition.transport.meter,
              beatsPerBar: Math.round(beatsPerBar),
            },
          })
        }
      />
      <label className="field">
        <span>Beat unit</span>
        <select
          aria-label="Beat unit"
          value={composition.transport.meter.beatUnit}
          onChange={(event) =>
            updateTransport({
              meter: {
                ...composition.transport.meter,
                beatUnit: Number(event.currentTarget.value) as MeterSpec['beatUnit'],
              },
            })
          }
        >
          {[2, 4, 8, 16].map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </label>
      <NumberField
        label="Loop start (beats)"
        value={composition.transport.loop.startBeat}
        min={0}
        step={0.25}
        onChange={(startBeat) =>
          updateTransport({
            loop: { ...composition.transport.loop, startBeat },
          })
        }
      />
      <NumberField
        label="Loop length (beats)"
        value={composition.transport.loop.lengthBeats}
        min={0.25}
        step={0.25}
        onChange={(lengthBeats) =>
          updateTransport({
            loop: {
              ...composition.transport.loop,
              lengthBeats: Math.max(0.25, lengthBeats),
            },
          })
        }
      />
    </RailPanel>
  )
}

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max?: number
  step: number
  onChange: (value: number) => void
}

function NumberField({ label, value, min, max, step, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  )
}
