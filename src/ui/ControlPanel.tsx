import type {
  FrequencyMode,
  HueSource,
  RotationMode,
  SpirophonicModel,
  Waveform,
} from '../core/model'

type ControlPanelProps = {
  model: SpirophonicModel
  onChange: (model: SpirophonicModel) => void
}

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function ControlPanel({ model, onChange }: ControlPanelProps) {
  const updateGeometry = (
    patch: Partial<SpirophonicModel['geometry']>,
  ) => {
    onChange({ ...model, geometry: { ...model.geometry, ...patch } })
  }
  const updateTime = (patch: Partial<SpirophonicModel['time']>) => {
    onChange({ ...model, time: { ...model.time, ...patch } })
  }
  const updateSound = (patch: Partial<SpirophonicModel['sound']>) => {
    onChange({ ...model, sound: { ...model.sound, ...patch } })
  }
  const updateColor = (patch: Partial<SpirophonicModel['color']>) => {
    onChange({ ...model, color: { ...model.color, ...patch } })
  }

  return (
    <aside className="control-panel" aria-label="Relationship controls">
      <section>
        <h2>Geometry</h2>
        <NumberField
          label="Fixed radius"
          value={model.geometry.fixedRadius}
          min={40}
          max={320}
          onChange={(fixedRadius) => updateGeometry({ fixedRadius })}
        />
        <NumberField
          label="Moving radius"
          value={model.geometry.movingRadius}
          min={10}
          max={180}
          onChange={(movingRadius) => updateGeometry({ movingRadius })}
        />
        <NumberField
          label="Pen offset"
          value={model.geometry.penOffset}
          min={0}
          max={220}
          onChange={(penOffset) => updateGeometry({ penOffset })}
        />
        <NumberField
          label="Phase"
          value={model.geometry.phase}
          min={0}
          max={Math.PI * 2}
          step={0.01}
          onChange={(phase) => updateGeometry({ phase })}
        />
        <NumberField
          label="Samples"
          value={model.geometry.samples}
          min={120}
          max={2400}
          step={10}
          onChange={(samples) => updateGeometry({ samples })}
        />
        <label className="field">
          <span>Rotation</span>
          <select
            value={model.geometry.rotation}
            onChange={(event) =>
              updateGeometry({
                rotation: event.currentTarget.value as RotationMode,
              })
            }
          >
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
          </select>
        </label>
      </section>

      <section>
        <h2>Time</h2>
        <NumberField
          label="Cycles per second"
          value={model.time.cyclesPerSecond}
          min={0.03}
          max={1.5}
          step={0.01}
          onChange={(cyclesPerSecond) => updateTime({ cyclesPerSecond })}
        />
      </section>

      <section>
        <h2>Sound</h2>
        <NumberField
          label="Base frequency"
          value={model.sound.baseFrequencyHz}
          min={55}
          max={880}
          onChange={(baseFrequencyHz) => updateSound({ baseFrequencyHz })}
        />
        <NumberField
          label="Minimum Hz"
          value={model.sound.minFrequencyHz}
          min={40}
          max={1200}
          onChange={(minFrequencyHz) => updateSound({ minFrequencyHz })}
        />
        <NumberField
          label="Maximum Hz"
          value={model.sound.maxFrequencyHz}
          min={80}
          max={1800}
          onChange={(maxFrequencyHz) => updateSound({ maxFrequencyHz })}
        />
        <label className="field">
          <span>Frequency mode</span>
          <select
            value={model.sound.frequencyMode}
            onChange={(event) =>
              updateSound({
                frequencyMode: event.currentTarget.value as FrequencyMode,
              })
            }
          >
            <option value="radius">Radius</option>
            <option value="x">X position</option>
            <option value="y">Y position</option>
            <option value="angle">Angle</option>
            <option value="ratio">Ratio</option>
          </select>
        </label>
        <label className="field">
          <span>Waveform</span>
          <select
            value={model.sound.waveform}
            onChange={(event) =>
              updateSound({ waveform: event.currentTarget.value as Waveform })
            }
          >
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
          </select>
        </label>
      </section>

      <section>
        <h2>Color</h2>
        <label className="field">
          <span>Hue source</span>
          <select
            value={model.color.hueSource}
            onChange={(event) =>
              updateColor({ hueSource: event.currentTarget.value as HueSource })
            }
          >
            <option value="angle">Angle</option>
            <option value="radius">Radius</option>
            <option value="velocity">Velocity</option>
            <option value="curvature">Curvature</option>
          </select>
        </label>
      </section>
    </aside>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: NumberFieldProps) {
  const handleChange = (nextValue: string) => {
    onChange(Number(nextValue))
  }

  return (
    <label className="field">
      <span>
        {label}
        <strong>{formatNumber(value)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => handleChange(event.currentTarget.value)}
      />
    </label>
  )
}

const formatNumber = (value: number) =>
  Number.isInteger(value) ? value : value.toFixed(2)

