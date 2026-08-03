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
          title="The curve every projection is read from. Visually it redraws the whole figure. Sonically it moves the rhythm, because each family closes its cycle differently and voices inherit this unless they choose their own shape."
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
              help="How many times the curve swings across the centre from side to side. Visually it adds lobes across the width. Sonically it is the number of hits per bar for any voice triggered on Crosses x, so against Y frequency this is the polyrhythm: 3 and 2 give three against two."
              value={model.geometry.lissFreqX}
              min={1}
              max={16}
              onChange={(lissFreqX) => updateGeometry({ lissFreqX })}
            />
            <NumberField
              label="Y frequency"
              help="How many times the curve swings across the centre from top to bottom. Visually it adds lobes down the height. Sonically it is the number of hits per bar for any voice triggered on Crosses y."
              value={model.geometry.lissFreqY}
              min={1}
              max={16}
              onChange={(lissFreqY) => updateGeometry({ lissFreqY })}
            />
            <NumberField
              label="Offset"
              help="Phase between the two swings. Visually it opens the figure out, from a leaning line through an ellipse to a full weave. Sonically it slides the x hits against the y hits without changing how many of either there are."
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
              help="Petals around the flower. An odd count gives that many, an even count gives twice as many. Visually the bloom. Sonically the hit count per bar for a voice triggered on Petal tips, since each tip fires once."
              value={model.geometry.roseN}
              min={1}
              max={16}
              onChange={(roseN) => updateGeometry({ roseN })}
            />
            <NumberField
              label="Divisor"
              help="Turns the petal count into a ratio, so the curve needs several turns to close. Visually the petals spread and overlap into a denser rosette. Sonically the pattern grows longer and less evenly spaced."
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
              help="Corners around the shape: a triangle, a square, a star. Visually the symmetry. Sonically the number of sharp turns a voice triggered on Cusps will find, so it sets that voice's hit count."
              value={model.geometry.sfM}
              min={0}
              max={20}
              onChange={(sfM) => updateGeometry({ sfM })}
            />
            <NumberField
              label="Roundness"
              help="Lower values pull the outline into a spiky star, higher values round it toward a circle. Visually the sharpness of the points. Sonically sharper points hit harder, because velocity follows how tightly the curve turns."
              value={model.geometry.sfN1}
              min={0.1}
              max={4}
              step={0.05}
              onChange={(sfN1) => updateGeometry({ sfN1 })}
            />
            <NumberField
              label="Pinch"
              help="Bows the sides in or out between corners. Visually it inflates the shape or hollows it into a pinwheel. Sonically it moves where along the bar the sharp turns fall, shifting the rhythm without changing its count."
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
              help="Swing rate of the side-to-side pendulum. A fractional value against the other axis makes the figure drift instead of retracing itself. Visually a slowly turning weave. Sonically it changes how many peaks a trigger finds, and so how many notes fill the bar."
              value={model.geometry.harmFreqX}
              min={1}
              max={8}
              step={0.01}
              onChange={(harmFreqX) => updateGeometry({ harmFreqX })}
            />
            <NumberField
              label="Y frequency"
              help="Swing rate of the up-and-down pendulum. Its ratio to the x swing sets the figure, exactly as it does for a lissajous. Sonically it changes the note count and spacing."
              value={model.geometry.harmFreqY}
              min={1}
              max={8}
              step={0.01}
              onChange={(harmFreqY) => updateGeometry({ harmFreqY })}
            />
            <NumberField
              label="Damping"
              help="How quickly the swing loses energy. Visually the curve spirals inward and then back out, because it is closed by retracing itself. Sonically that symmetry is a swell and fade across the bar, since velocity follows how far the curve reaches. This is what makes a harmonograph sound like an ambient part."
              value={model.geometry.harmDamping}
              min={0}
              max={0.2}
              step={0.005}
              onChange={(harmDamping) => updateGeometry({ harmDamping })}
            />
            <NumberField
              label="Turns"
              help="Windings traced before the curve turns back on itself. Visually denser layering. Sonically more peaks, so more notes in the bar and a busier part."
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
          help="Size of the fixed circle the pen wheel rolls against. Visually the overall reach of the trace. Sonically it matters through its ratio to the moving radius, which decides how many lobes the curve makes and therefore how many notes a cusp or petal trigger produces."
          value={model.geometry.fixedRadius}
          min={40}
          max={320}
          onChange={(fixedRadius) => updateGeometry({ fixedRadius })}
        />
        <NumberField
          label="Moving radius"
          help="Size of the rolling wheel. Its ratio to the fixed radius sets how many lobes the trace makes before closing. Visually the symmetry. Sonically the hit count, and how long the curve takes to come back to its start."
          value={model.geometry.movingRadius}
          min={10}
          max={180}
          onChange={(movingRadius) => updateGeometry({ movingRadius })}
        />
        <NumberField
          label="Pen offset"
          help="How far the pen sits from the centre of the rolling wheel. Visually the loops grow, cross each other, and reach past the rim. Sonically it sharpens the turns, and a sharper turn is a louder hit, so this shapes dynamics more than rhythm."
          value={model.geometry.penOffset}
          min={0}
          max={220}
          onChange={(penOffset) => updateGeometry({ penOffset })}
        />
        <label
          className="field"
          title="Whether the wheel rolls inside the fixed circle or around the outside. Visually inward petals against outward loops. Sonically it moves where the sharp turns land in the bar, so the rhythm shifts even though the ratios have not."
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
          help="Rotates the relationship through its own cycle without touching any ratio. Visually the figure spins in place. Sonically every voice slides together against the bar line, so the whole pattern shifts early or late while keeping its shape."
          value={model.geometry.phase}
          min={0}
          max={Math.PI * 2}
          step={0.01}
          onChange={(phase) => updateGeometry({ phase })}
        />
        <NumberField
          label="Samples"
          help="How many points the curve is measured at. Visually higher is a smoother line. Sonically it is the resolution onsets are found at: too few and a peak can be missed or land slightly early, which reads as a note going astray."
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
          help="How fast one closed curve is traced, in cycles per second. Visually the animation rate. Sonically the tempo, because one curve is one bar: at 0.2 a bar lasts five seconds. This same number becomes Strudel's setcps and the tempo written into the MIDI file."
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
          help="Anchor pitch for the tone that follows the moving trace point. Sonically the pitch heard at the middle of the mapped range. This is the live trace tone only; voices take their pitch from their own scale."
          value={model.sound.baseFrequencyHz}
          min={55}
          max={880}
          onChange={(baseFrequencyHz) => updateSound({ baseFrequencyHz })}
        />
        <NumberField
          label="Minimum Hz"
          help="Floor for the tone that follows the trace point. Sonically the lowest pitch the glide can reach. Affects the live trace tone, not the voices."
          value={model.sound.minFrequencyHz}
          min={40}
          max={1200}
          onChange={(minFrequencyHz) => updateSound({ minFrequencyHz })}
        />
        <NumberField
          label="Maximum Hz"
          help="Ceiling for the tone that follows the trace point. Sonically the highest pitch the glide can reach; a wide span makes the trace sweep dramatically, a narrow one keeps it near one note."
          value={model.sound.maxFrequencyHz}
          min={80}
          max={1800}
          onChange={(maxFrequencyHz) => updateSound({ maxFrequencyHz })}
        />
        <label
          className="field"
          title="Which property of the moving trace point sets the live tone's pitch: its distance from centre, its position, its winding angle, or a ratio. Sonically it changes the shape of the glide as the curve is drawn. Visually nothing."
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
        <label className="field" title="Timbre of the live trace tone, and of pitched voices when previewing. Sine is soft and round, triangle hollow, square and sawtooth bright and buzzy. Sonically only.">
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
          title="Which property of the curve paints its colour: winding angle, distance from centre, how fast the pen is moving, or how tightly it is turning. Visually only — the sound is untouched, though curvature colours the same sharp turns that trigger the loudest hits."
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
