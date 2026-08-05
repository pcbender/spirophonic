import type {
  Composition,
  InstrumentSpec,
  NativeDrumInstrumentSpec,
  NativeSynthInstrumentSpec,
} from '../core/composition'

export type InstrumentPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const waveforms: Array<NativeSynthInstrumentSpec['waveform']> = [
  'sine',
  'triangle',
  'square',
  'sawtooth',
]

const drumVoices: Array<NativeDrumInstrumentSpec['voice']> = [
  'kick',
  'snare',
  'hat',
  'tom',
  'clap',
  'cymbal',
]

export function InstrumentPanel({ composition, onChange }: InstrumentPanelProps) {
  const update = (id: string, next: (instrument: InstrumentSpec) => InstrumentSpec) =>
    onChange({
      ...composition,
      instruments: composition.instruments.map((instrument) =>
        instrument.id === id ? next(instrument) : instrument,
      ),
    })

  return (
    <section className="control-panel" aria-label="Instruments">
      <h2>Instruments</h2>
      <ol className="voice-list">
        {composition.instruments.map((instrument) => (
          <li key={instrument.id} className="voice-row">
            <div className="voice-head">
              <strong>{instrument.name}</strong>
              <code>{instrument.kind}</code>
            </div>
            <label>
              <span>Name</span>
              <input aria-label={`Name ${instrument.id}`} value={instrument.name} onChange={(event) => update(instrument.id, (current) => ({ ...current, name: event.currentTarget.value }))} />
            </label>
            <NumberField label={`Gain ${instrument.id}`} shortLabel="Gain" value={instrument.gain} min={0} max={1} step={0.01} onChange={(gain) => update(instrument.id, (current) => ({ ...current, gain }))} />
            <NumberField label={`Pan ${instrument.id}`} shortLabel="Pan" value={instrument.pan} min={-1} max={1} step={0.01} onChange={(pan) => update(instrument.id, (current) => ({ ...current, pan }))} />
            {instrument.kind === 'native-synth' && (
              <>
                <label>
                  <span>Waveform</span>
                  <select aria-label={`Waveform ${instrument.id}`} value={instrument.waveform} onChange={(event) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, waveform: event.currentTarget.value as NativeSynthInstrumentSpec['waveform'] } : current)}>
                    {waveforms.map((waveform) => <option key={waveform} value={waveform}>{waveform}</option>)}
                  </select>
                </label>
                <NumberField label={`Attack ${instrument.id}`} shortLabel="Attack" value={instrument.envelope.attackSeconds} min={0} max={10} step={0.01} onChange={(attackSeconds) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, envelope: { ...current.envelope, attackSeconds } } : current)} />
                <NumberField label={`Release ${instrument.id}`} shortLabel="Release" value={instrument.envelope.releaseSeconds} min={0} max={10} step={0.01} onChange={(releaseSeconds) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, envelope: { ...current.envelope, releaseSeconds } } : current)} />
              </>
            )}
            {instrument.kind === 'native-drum' && (
              <label>
                <span>Voice</span>
                <select aria-label={`Voice ${instrument.id}`} value={instrument.voice} onChange={(event) => update(instrument.id, (current) => current.kind === 'native-drum' ? { ...current, voice: event.currentTarget.value as NativeDrumInstrumentSpec['voice'] } : current)}>
                  {drumVoices.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
                </select>
              </label>
            )}
            {instrument.kind === 'soundfont' && (
              <p>SoundFont playback arrives in MG-11.</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

type NumberFieldProps = {
  label: string
  shortLabel: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function NumberField({ label, shortLabel, value, min, max, step, onChange }: NumberFieldProps) {
  return (
    <label>
      <span>{shortLabel}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}
