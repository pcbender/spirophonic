import type { SpirophonicModel } from '../core/model'
import { presets } from '../core/presets'

type PresetPickerProps = {
  model: SpirophonicModel
  onSelect: (model: SpirophonicModel) => void
}

export function PresetPicker({ model, onSelect }: PresetPickerProps) {
  return (
    <label className="preset-picker">
      <span>Preset</span>
      <select
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

