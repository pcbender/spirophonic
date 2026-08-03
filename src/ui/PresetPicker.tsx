import type { SpirophonicModel } from '../core/model'
import { presets } from '../core/presets'

type PresetPickerProps = {
  model: SpirophonicModel
  onSelect: (model: SpirophonicModel) => void
}

export function PresetPicker({ model, onSelect }: PresetPickerProps) {
  return (
    <label
      className="preset-picker"
      title="Loads a whole relationship at once: shape, colour, tone, and speed. Visually the trace is replaced; sonically the tempo and the live tone change, and because voices inherit the main shape, the rhythm moves with it."
    >
      <span>Preset</span>
      <select
        title="Loads a whole relationship at once: shape, colour, tone, and speed. Visually the trace is replaced; sonically the tempo and the live tone change, and because voices inherit the main shape, the rhythm moves with it."
        value={model.id}
        onChange={(event) => {
          const preset = presets.find(
            (candidate) => candidate.id === event.currentTarget.value,
          )
          if (preset) {
            onSelect(preset)
          }
        }}
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </label>
  )
}
