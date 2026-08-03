import type {
  CurveFamily,
  FrequencyMode,
  HueSource,
  RotationMode,
  SpirophonicModel,
  Waveform,
} from '../core/model'
import { curveFamilies } from '../core/curves'
import {
  formatCycleSetting,
  maxCyclesPerSecond,
  minCyclesPerSecond,
} from '../core/time'

const familyLabels: Record<CurveFamily, string> = {
  spirogram: 'Spirogram',
  lissajous: 'Lissajous',
  rose: 'Rose',
  superformula: 'Superformula',
  harmonograph: 'Harmonograph',
}

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
  help: string
  formatValue?: (value: number) => string
  minLabel?: string
  maxLabel?: string
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
        <h2>Shape</h2>
        <label
          className="field"
          title="Which curve the relationship draws. Every voice inherits this unless it sets its own."
        >
          <span>Family</span>
          <select
            value={model.geometry.family}
            onChange={(event) =>
              updateGeometry({
                family: event.currentTarget.value as CurveFamily,
              })
            }
          >
            {curveFamilies.map((family) => (
              <option key={family} value={family}>
                {familyLabels[family]}
              </option>
            ))}
          </select>
        </label>

        {model.geometry.family === 'lissajous' && (
          <>
            <NumberField
              label="X frequency"
              help="Crossings of the x axis per cycle. Against the y frequency this is the polyrhythm."
              value={model.geometry.lissFreqX}
              min={1}
              max={16}
              onChange={(lissFreqX) => updateGeometry({ lissFreqX })}
            />
            <NumberField
              label="Y frequency"
              help="Crossings of the y axis per cycle."
              value={model.geometry.lissFreqY}
              min={1}
              max={16}
              onChange={(lissFreqY) => updateGeometry({ lissFreqY })}
            />
            <NumberField
              label="Offset"
              help="Phase between the two axes. Changes the figure without changing the ratio."
              value={model.geometry.lissDelta}
              min={0}
              max={Math.PI}
              step={0.01}
              onChange={(lissDelta) => updateGeometry({ lissDelta })}
            />
          </>
        )}

        {model.geometry.family === 'rose' && (
          <>
            <NumberField
              label="Petals"
              help="An odd count gives that many petals; an even count gives twice as many."
              value={model.geometry.roseN}
              min={1}
              max={16}
              onChange={(roseN) => updateGeometry({ roseN })}
            />
            <NumberField
              label="Divisor"
              help="Turns the petal count into a ratio, which opens the curve out over several turns."
              value={model.geometry.roseD}
              min={1}
              max={8}
              onChange={(roseD) => updateGeometry({ roseD })}
            />
          </>
        )}

        {model.geometry.family === 'superformula' && (
          <>
            <NumberField
              label="Symmetry"
              help="Number of corners around the shape."
              value={model.geometry.sfM}
              min={0}
              max={20}
              onChange={(sfM) => updateGeometry({ sfM })}
            />
            <NumberField
              label="Roundness"
              help="Lower values push the shape toward a star."
              value={model.geometry.sfN1}
              min={0.1}
              max={4}
              step={0.05}
              onChange={(sfN1) => updateGeometry({ sfN1 })}
            />
            <NumberField
              label="Pinch"
              help="Bends the corners in or out."
              value={model.geometry.sfN2}
              min={0.1}
              max={4}
              step={0.05}
              onChange={(sfN2) => updateGeometry({ sfN2, sfN3: model.geometry.sfN3 })}
            />
          </>
        )}

        {model.geometry.family === 'harmonograph' && (
          <>
            <NumberField
              label="X frequency"
              help="Swing of the x pendulum. Fractional values against y make the figure precess."
              value={model.geometry.harmFreqX}
              min={1}
              max={8}
              step={0.01}
              onChange={(harmFreqX) => updateGeometry({ harmFreqX })}
            />
            <NumberField
              label="Y frequency"
              help="Swing of the y pendulum."
              value={model.geometry.harmFreqY}
              min={1}
              max={8}
              step={0.01}
              onChange={(harmFreqY) => updateGeometry({ harmFreqY })}
            />
            <NumberField
              label="Damping"
              help="How fast the pendulum decays. This is what makes a part swell and fade across the bar."
              value={model.geometry.harmDamping}
              min={0}
              max={0.2}
              step={0.005}
              onChange={(harmDamping) => updateGeometry({ harmDamping })}
            />
            <NumberField
              label="Turns"
              help="Windings traced before the curve retraces itself."
              value={model.geometry.harmTurns}
              min={1}
              max={40}
              onChange={(harmTurns) => updateGeometry({ harmTurns })}
            />
          </>
        )}

        {model.geometry.family === 'spirogram' && (
          <>
        <NumberField
          label="Fixed radius"
          help="Radius of the fixed circle that the moving circle rolls around."
          value={model.geometry.fixedRadius}
          min={40}
          max={320}
          onChange={(fixedRadius) => updateGeometry({ fixedRadius })}
        />
        <NumberField
          label="Moving radius"
          help="Radius of the rolling circle. Different ratios create different trace symmetries."
          value={model.geometry.movingRadius}
          min={10}
          max={180}
          onChange={(movingRadius) => updateGeometry({ movingRadius })}
        />
        <NumberField
          label="Pen offset"
          help="Distance of the drawing point from the center of the moving circle."
          value={model.geometry.penOffset}
          min={0}
          max={220}
          onChange={(penOffset) => updateGeometry({ penOffset })}
        />
        <label
          className="field"
          title="Inside creates a hypotrochoid; outside creates an epitrochoid."
        >
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
          </>
        )}

        <NumberField
          label="Phase"
          help="Rotates the relationship through its cycle without changing the ratios. Shifts every voice's onsets together."
          value={model.geometry.phase}
          min={0}
          max={Math.PI * 2}
          step={0.01}
          onChange={(phase) => updateGeometry({ phase })}
        />
        <NumberField
          label="Samples"
          help="Number of points used to draw and map the trace. Higher values are smoother."
          value={model.geometry.samples}
          min={120}
          max={2400}
          step={10}
          onChange={(samples) => updateGeometry({ samples })}
        />
      </section>

      <section>
        <h2>Time</h2>
        <NumberField
          label="Speed"
          help="Animation speed as cycles per second. This is the same number exported to Strudel setcps()."
          value={model.time.cyclesPerSecond}
          min={minCyclesPerSecond}
          max={maxCyclesPerSecond}
          step={0.01}
          formatValue={formatCycleSetting}
          minLabel="Slow"
          maxLabel="Fast"
          onChange={(cyclesPerSecond) => updateTime({ cyclesPerSecond })}
        />
      </section>

      <section>
        <h2>Sound</h2>
        <NumberField
          label="Base frequency"
          help="Anchor pitch for the sound mapping. At the midpoint of a mapping, the sound lands here."
          value={model.sound.baseFrequencyHz}
          min={55}
          max={880}
          onChange={(baseFrequencyHz) => updateSound({ baseFrequencyHz })}
        />
        <NumberField
          label="Minimum Hz"
          help="Lowest frequency the generated sound can use."
          value={model.sound.minFrequencyHz}
          min={40}
          max={1200}
          onChange={(minFrequencyHz) => updateSound({ minFrequencyHz })}
        />
        <NumberField
          label="Maximum Hz"
          help="Highest frequency the generated sound can use."
          value={model.sound.maxFrequencyHz}
          min={80}
          max={1800}
          onChange={(maxFrequencyHz) => updateSound({ maxFrequencyHz })}
        />
        <label
          className="field"
          title="Chooses which geometric value controls oscillator frequency."
        >
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
        <label className="field" title="Oscillator waveform used by WebAudio.">
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
        <label
          className="field"
          title="Chooses which geometric value controls trace hue."
        >
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
  help,
  formatValue = formatNumber,
  minLabel,
  maxLabel,
  onChange,
}: NumberFieldProps) {
  const handleChange = (nextValue: string) => {
    onChange(Number(nextValue))
  }

  return (
    <label className="field" title={help}>
      <span>
        {label}
        <strong title={help}>{formatValue(value)}</strong>
      </span>
      <input
        title={help}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => handleChange(event.currentTarget.value)}
      />
      {minLabel && maxLabel ? (
        <small className="range-labels">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </small>
      ) : null}
    </label>
  )
}

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2)
