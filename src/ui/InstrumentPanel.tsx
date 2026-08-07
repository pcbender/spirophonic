import { useState } from 'react'

import type {
  Composition,
  InstrumentSpec,
  NativeDrumInstrumentSpec,
  NativeSynthInstrumentSpec,
  SoundFontInstrumentSpec,
} from '../core/composition'
import {
  addInstrument,
  removalImpact,
  removalIsBlocked,
  removeInstrument,
  type RemovalImpact,
} from '../core/compositionEdits'
import { help } from './help'
import { RailPanel } from './RailPanel'

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

const nativeSynthFallback = (
  instrument: SoundFontInstrumentSpec,
): NativeSynthInstrumentSpec => ({
  id: instrument.id,
  name: `${instrument.name} · native fallback`,
  kind: 'native-synth',
  gain: instrument.gain,
  pan: instrument.pan,
  waveform: 'triangle',
  envelope: {
    attackSeconds: 0.01,
    decaySeconds: 0.12,
    sustain: 0.68,
    releaseSeconds: 0.24,
  },
})

const nativeDrumFallback = (
  instrument: SoundFontInstrumentSpec,
): NativeDrumInstrumentSpec => ({
  id: instrument.id,
  name: `${instrument.name} · native drum fallback`,
  kind: 'native-drum',
  gain: instrument.gain,
  pan: instrument.pan,
  voice: 'kick',
})

export function InstrumentPanel({ composition, onChange }: InstrumentPanelProps) {
  // Both blockers on removing an Instrument are refusals, not warnings, so this
  // holds an impact to explain rather than a removal to confirm.
  const [blocked, setBlocked] = useState<RemovalImpact | null>(null)

  const update = (id: string, next: (instrument: InstrumentSpec) => InstrumentSpec) =>
    onChange({
      ...composition,
      instruments: composition.instruments.map((instrument) =>
        instrument.id === id ? next(instrument) : instrument,
      ),
    })

  const remove = (id: string) => {
    const impact = removalImpact(composition, 'instrument', id)
    if (removalIsBlocked(impact)) {
      setBlocked(impact)
      return
    }
    setBlocked(null)
    onChange(removeInstrument(composition, id))
  }

  return (
    <RailPanel
      label="Instruments"
      title="Instruments"
      actions={
        <button
          type="button"
          title={help['instrument.add']}
          onClick={() => {
            const template =
              composition.instruments[composition.instruments.length - 1]
            if (!template) return
            onChange(addInstrument(composition, template).composition)
          }}
        >
          Add Instrument
        </button>
      }
    >
      <ol className="voice-list">
        {composition.instruments.map((instrument) => (
          <li key={instrument.id} className="voice-row">
            <div className="voice-head">
              <strong>{instrument.name}</strong>
              <code>{instrument.kind}</code>
              <button
                type="button"
                title={help['instrument.remove']}
                aria-label={`Remove ${instrument.name}`}
                onClick={() => remove(instrument.id)}
              >
                Remove
              </button>
            </div>
            <label title={help['instrument.name']}>
              <span>Name</span>
              <input aria-label={`Name ${instrument.id}`} value={instrument.name} onChange={(event) => update(instrument.id, (current) => ({ ...current, name: event.currentTarget.value }))} />
            </label>
            <NumberField label={`Gain ${instrument.id}`} shortLabel="Gain" hint={help['instrument.gain']} value={instrument.gain} min={0} max={1} step={0.01} onChange={(gain) => update(instrument.id, (current) => ({ ...current, gain }))} />
            <NumberField label={`Pan ${instrument.id}`} shortLabel="Pan" hint={help['instrument.pan']} value={instrument.pan} min={-1} max={1} step={0.01} onChange={(pan) => update(instrument.id, (current) => ({ ...current, pan }))} />
            {instrument.kind === 'native-synth' && (
              <>
                <label title={help['instrument.waveform']}>
                  <span>Waveform</span>
                  <select aria-label={`Waveform ${instrument.id}`} value={instrument.waveform} onChange={(event) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, waveform: event.currentTarget.value as NativeSynthInstrumentSpec['waveform'] } : current)}>
                    {waveforms.map((waveform) => <option key={waveform} value={waveform}>{waveform}</option>)}
                  </select>
                </label>
                <NumberField label={`Attack ${instrument.id}`} shortLabel="Attack" hint={help['instrument.attack']} value={instrument.envelope.attackSeconds} min={0} max={10} step={0.01} onChange={(attackSeconds) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, envelope: { ...current.envelope, attackSeconds } } : current)} />
                <NumberField label={`Decay ${instrument.id}`} shortLabel="Decay" hint={help['instrument.decay']} value={instrument.envelope.decaySeconds} min={0} max={60} step={0.01} onChange={(decaySeconds) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, envelope: { ...current.envelope, decaySeconds } } : current)} />
                <NumberField label={`Sustain ${instrument.id}`} shortLabel="Sustain" hint={help['instrument.sustain']} value={instrument.envelope.sustain} min={0} max={1} step={0.01} onChange={(sustain) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, envelope: { ...current.envelope, sustain } } : current)} />
                <NumberField label={`Release ${instrument.id}`} shortLabel="Release" hint={help['instrument.release']} value={instrument.envelope.releaseSeconds} min={0} max={10} step={0.01} onChange={(releaseSeconds) => update(instrument.id, (current) => current.kind === 'native-synth' ? { ...current, envelope: { ...current.envelope, releaseSeconds } } : current)} />
              </>
            )}
            {instrument.kind === 'native-drum' && (
              <label title={help['instrument.voice']}>
                <span>Voice</span>
                <select aria-label={`Voice ${instrument.id}`} value={instrument.voice} onChange={(event) => update(instrument.id, (current) => current.kind === 'native-drum' ? { ...current, voice: event.currentTarget.value as NativeDrumInstrumentSpec['voice'] } : current)}>
                  {drumVoices.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
                </select>
              </label>
            )}
            {instrument.kind === 'soundfont' && (
              <>
                <p className="instrument-preset">
                  <strong>{instrument.presetName}</strong><br />
                  Bank {instrument.bank} · Program {instrument.program}
                  {instrument.percussion ? ' · drums' : ''}
                </p>
                <NumberField
                  label={`Reverb ${instrument.id}`}
                  shortLabel="Reverb" hint={help['instrument.reverb']}
                  value={instrument.reverb}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(reverb) =>
                    update(instrument.id, (current) =>
                      current.kind === 'soundfont'
                        ? { ...current, reverb }
                        : current,
                    )
                  }
                />
                <NumberField
                  label={`Chorus ${instrument.id}`}
                  shortLabel="Chorus" hint={help['instrument.chorus']}
                  value={instrument.chorus}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(chorus) =>
                    update(instrument.id, (current) =>
                      current.kind === 'soundfont'
                        ? { ...current, chorus }
                        : current,
                    )
                  }
                />
                <div className="panel-actions instrument-fallbacks">
                  <button
                    type="button"
                    onClick={() =>
                      update(instrument.id, (current) =>
                        current.kind === 'soundfont'
                          ? nativeSynthFallback(current)
                          : current,
                      )
                    }
                  >
                    Use native synth
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(instrument.id, (current) =>
                        current.kind === 'soundfont'
                          ? nativeDrumFallback(current)
                          : current,
                      )
                    }
                  >
                    Use native drum
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
      {blocked && (
        <div
          className="removal-impact"
          role="alertdialog"
          aria-label="Cannot remove Instrument"
        >
          <h3>Cannot remove {blocked.name}</h3>
          <ul>
            {blocked.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setBlocked(null)}>
            Close
          </button>
        </div>
      )}
    </RailPanel>
  )
}

type NumberFieldProps = {
  label: string
  shortLabel: string
  value: number
  min: number
  max: number
  step: number
  /** Hover help. See `./help`. */
  hint?: string
  onChange: (value: number) => void
}

function NumberField({ label, shortLabel, value, min, max, step, hint, onChange }: NumberFieldProps) {
  return (
    <label title={hint}>
      <span>{shortLabel}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}
