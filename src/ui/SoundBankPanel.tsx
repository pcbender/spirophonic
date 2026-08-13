import { useMemo, useState } from 'react'

import type {
  Composition,
  SoundBankReference,
  SoundFontInstrumentSpec,
} from '../core/composition'
import {
  soundFontBankNumber,
  type SoundFontPreset,
} from '../audio/soundfontEngine'
import { addInstrument } from '../core/compositionEdits'
import { help } from './help'
import { RailPanel } from './RailPanel'
import { errorMessage, type BankView, type SoundBankViews } from './useSoundBankViews'

/**
 * The working surface for sound banks: find a preset, hear it, add it.
 *
 * Importing a bank, recording its licence, relinking it, and removing its bytes
 * are not here — they are setup, and they live in Settings. What remains is
 * only what you reach for while composing, plus enough state to know whether a
 * bank can be reached at all.
 */

export type SoundBankPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
  banks: SoundBankViews
  audition: (
    reference: SoundBankReference,
    preset: SoundFontPreset,
    note: number,
    oneShot?: boolean,
  ) => Promise<void>
  /** Opens Settings, where an unreachable bank is relinked. */
  onOpenSettings: () => void
}

const noteNames = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
]

const noteName = (note: number) =>
  `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`

export function SoundBankPanel({
  composition,
  onChange,
  banks,
  audition,
  onOpenSettings,
}: SoundBankPanelProps) {
  const [message, setMessage] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<Record<string, number>>(
    {},
  )
  const [search, setSearch] = useState<Record<string, string>>({})

  const add = (
    reference: SoundBankReference,
    preset: SoundFontPreset,
    requestedName: string,
    oneShot: boolean,
    note: number,
  ) => {
    const result = addInstrument(composition, {
      id: 'soundfont-template',
      name: requestedName.trim() || preset.name,
      kind: 'soundfont',
      gain: 0.5,
      pan: 0,
      soundBankId: reference.id,
      bank: soundFontBankNumber(preset),
      program: preset.program,
      presetName: preset.name,
      percussion: preset.isDrum,
      ...(oneShot
        ? { trigger: { kind: 'one-shot' as const, note } }
        : {}),
      reverb: 0.2,
      chorus: 0,
    } satisfies SoundFontInstrumentSpec)
    const added = result.composition.instruments.find(
      (instrument) => instrument.id === result.instrumentId,
    )
    onChange(result.composition)
    setMessage(`Added ${added?.name ?? preset.name}.`)
  }

  return (
    <RailPanel
      label="Sound banks"
      title="Sound banks"
      className="sound-bank-panel"
      actions={
        <button
          type="button"
          title={help['bank.manage']}
          onClick={onOpenSettings}
        >
          Manage banks
        </button>
      }
    >
      {composition.soundBanks.length === 0 ? (
        <p className="settings-note">
          No bank in this Composition. Import one in Settings → Sound banks.
        </p>
      ) : null}
      <output aria-live="polite">{message}</output>
      <ol className="sound-bank-list">
        {composition.soundBanks.map((reference) => (
          <BankCard
            key={reference.id}
            reference={reference}
            view={banks.views[reference.id] ?? { state: 'loading', presets: [] }}
            selectedIndex={selectedPreset[reference.id] ?? 0}
            search={search[reference.id] ?? ''}
            onSearch={(value) =>
              setSearch((current) => ({ ...current, [reference.id]: value }))
            }
            onPresetChange={(value) =>
              setSelectedPreset((current) => ({
                ...current,
                [reference.id]: value,
              }))
            }
            onAdd={(preset, name, oneShot, note) =>
              add(reference, preset, name, oneShot, note)
            }
            onAudition={(preset, note, oneShot) =>
              void audition(reference, preset, note, oneShot).catch((error) =>
                setMessage(errorMessage(error)),
              )
            }
            onOpenSettings={onOpenSettings}
          />
        ))}
      </ol>
    </RailPanel>
  )
}

type BankCardProps = {
  reference: SoundBankReference
  view: BankView
  selectedIndex: number
  search: string
  onSearch: (value: string) => void
  onPresetChange: (index: number) => void
  onAdd: (
    preset: SoundFontPreset,
    name: string,
    oneShot: boolean,
    note: number,
  ) => void
  onAudition: (preset: SoundFontPreset, note: number, oneShot: boolean) => void
  onOpenSettings: () => void
}

function BankCard({
  reference,
  view,
  selectedIndex,
  search,
  onSearch,
  onPresetChange,
  onAdd,
  onAudition,
  onOpenSettings,
}: BankCardProps) {
  const [oneShot, setOneShot] = useState(false)
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return view.presets.filter(
      (preset) =>
        preset.isDrum === oneShot &&
        (!needle ||
          `${preset.name} ${preset.bankMSB}:${preset.bankLSB}:${preset.program}${preset.isDrum ? ' drums' : ''}`
            .toLowerCase()
            .includes(needle)),
    )
  }, [oneShot, search, view.presets])
  const preset = filtered[Math.min(selectedIndex, filtered.length - 1)]
  const [instrumentNames, setInstrumentNames] = useState<
    Record<string, string>
  >({})
  const [note, setNote] = useState(60)
  const presetKey = preset
    ? `${preset.bankMSB}:${preset.bankLSB}:${preset.program}:${preset.name}`
    : ''
  const instrumentName = preset
    ? (instrumentNames[presetKey] ?? preset.name)
    : ''

  return (
    <li className="sound-bank-card">
      <div className="voice-head">
        <strong>{reference.name}</strong>
        <span className={`bank-state bank-state-${view.state}`}>{view.state}</span>
      </div>
      {view.state === 'ready' ? (
        <>
          <label className="field" title={help['bank.find']}>
            <span>Find preset</span>
            <input
              aria-label={`Find preset ${reference.id}`}
              value={search}
              onChange={(event) => onSearch(event.currentTarget.value)}
            />
          </label>
          <label className="field">
            <span>Preset ({filtered.length})</span>
            <select
              title={help['bank.preset']}
              aria-label={`Preset ${reference.id}`}
              value={preset ? filtered.indexOf(preset) : ''}
              disabled={filtered.length === 0}
              onChange={(event) => onPresetChange(Number(event.currentTarget.value))}
            >
              {filtered.length === 0 && (
                <option value="">No matching presets</option>
              )}
              {filtered.map((item, index) => (
                <option key={`${item.bankMSB}:${item.bankLSB}:${item.program}:${item.name}`} value={index}>
                  {item.name} · {item.bankMSB}:{item.bankLSB}:{item.program}{item.isDrum ? ' · drums' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field" title={help['bank.playback']}>
            <span>Playback</span>
            <select
              aria-label={`Playback ${reference.id}`}
              value={oneShot ? 'drums' : 'pitched'}
              onChange={(event) =>
                setOneShot(event.currentTarget.value === 'drums')
              }
            >
              <option value="pitched">Pitched</option>
              <option value="drums">Drums</option>
            </select>
          </label>
          <div className="preset-preview">
            <label className="field" title={help['bank.note']}>
              <span>{oneShot ? 'MIDI note' : 'Preview note'}</span>
              <input
                type="number"
                min={0}
                max={127}
                step={1}
                aria-label={`MIDI note ${reference.id}`}
                value={note}
                onChange={(event) =>
                  setNote(
                    Math.min(
                      127,
                      Math.max(0, Math.round(Number(event.currentTarget.value))),
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              disabled={!preset}
              title={help['bank.audition']}
              onClick={() => preset && onAudition(preset, note, oneShot)}
            >
              Preview {noteName(note)}
            </button>
          </div>
          <div className="preset-assignment">
            <label className="field" title={help['bank.instrumentName']}>
              <span>Instrument name</span>
              <input
                aria-label={`Instrument name ${reference.id}`}
                value={instrumentName}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  setInstrumentNames((current) => ({
                    ...current,
                    [presetKey]: value,
                  }))
                }}
              />
            </label>
            <button
              type="button"
              disabled={!preset}
              onClick={() =>
                preset && onAdd(preset, instrumentName, oneShot, note)
              }
              title={help['bank.addInstrument']}
            >
              Add instrument
            </button>
          </div>
        </>
      ) : view.state === 'loading' ? (
        <p>Loading bank and enumerating presets…</p>
      ) : (
        // The fix is in Settings, so the report that something is wrong carries
        // the way to it rather than leaving the user to find the door.
        <p role="alert">
          {view.message}{' '}
          <button
            type="button"
            className="link-button"
            title={help['bank.manage']}
            onClick={onOpenSettings}
          >
            Open Settings
          </button>
        </p>
      )}
    </li>
  )
}
