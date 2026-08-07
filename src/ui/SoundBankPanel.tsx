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
import { help } from './help'
import { RailPanel } from './RailPanel'
import { errorMessage, type BankView, type SoundBankViews } from './useSoundBankViews'

/**
 * The working surface for sound banks: find a preset, hear it, assign it.
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
  ) => Promise<void>
  /** Opens Settings, where an unreachable bank is relinked. */
  onOpenSettings: () => void
}

const auditionNotes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69]

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
  const [assignmentTarget, setAssignmentTarget] = useState<
    Record<string, string>
  >({})
  const [search, setSearch] = useState<Record<string, string>>({})

  const assign = (reference: SoundBankReference, preset: SoundFontPreset) => {
    const target =
      assignmentTarget[reference.id] ?? composition.instruments[0]?.id
    if (!target) {
      setMessage('Create an Instrument before assigning a preset.')
      return
    }
    onChange({
      ...composition,
      instruments: composition.instruments.map((instrument) =>
        instrument.id === target
          ? ({
              id: instrument.id,
              name: preset.name,
              kind: 'soundfont',
              gain: instrument.gain,
              pan: instrument.pan,
              soundBankId: reference.id,
              bank: soundFontBankNumber(preset),
              program: preset.program,
              presetName: preset.name,
              percussion: preset.isDrum,
              reverb: 0.2,
              chorus: 0,
            } satisfies SoundFontInstrumentSpec)
          : instrument,
      ),
    })
    setMessage(`Assigned ${preset.name} to ${target}.`)
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
            composition={composition}
            view={banks.views[reference.id] ?? { state: 'loading', presets: [] }}
            selectedIndex={selectedPreset[reference.id] ?? 0}
            assignmentTarget={
              assignmentTarget[reference.id] ??
              composition.instruments[0]?.id ??
              ''
            }
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
            onTargetChange={(value) =>
              setAssignmentTarget((current) => ({
                ...current,
                [reference.id]: value,
              }))
            }
            onAssign={(preset) => assign(reference, preset)}
            onAudition={(preset, note) =>
              void audition(reference, preset, note).catch((error) =>
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
  composition: Composition
  view: BankView
  selectedIndex: number
  assignmentTarget: string
  search: string
  onSearch: (value: string) => void
  onPresetChange: (index: number) => void
  onTargetChange: (id: string) => void
  onAssign: (preset: SoundFontPreset) => void
  onAudition: (preset: SoundFontPreset, note: number) => void
  onOpenSettings: () => void
}

function BankCard({
  reference,
  composition,
  view,
  selectedIndex,
  assignmentTarget,
  search,
  onSearch,
  onPresetChange,
  onTargetChange,
  onAssign,
  onAudition,
  onOpenSettings,
}: BankCardProps) {
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return view.presets
    return view.presets.filter((preset) =>
      `${preset.name} ${preset.bankMSB}:${preset.bankLSB}:${preset.program}`
        .toLowerCase()
        .includes(needle),
    )
  }, [search, view.presets])
  const preset = filtered[Math.min(selectedIndex, filtered.length - 1)]

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
              onChange={(event) => onPresetChange(Number(event.currentTarget.value))}
            >
              {filtered.map((item, index) => (
                <option key={`${item.bankMSB}:${item.bankLSB}:${item.program}:${item.name}`} value={index}>
                  {item.name} · {item.bankMSB}:{item.bankLSB}:{item.program}{item.isDrum ? ' · drums' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="audition-keyboard" aria-label={`Audition keyboard ${reference.id}`}>
            {auditionNotes.map((note) => (
              <button
                key={note}
                type="button"
                disabled={!preset}
                title={help['bank.audition']}
                aria-label={`Audition ${noteName(note)} ${reference.id}`}
                onClick={() => preset && onAudition(preset, note)}
              >
                {noteName(note)}
              </button>
            ))}
          </div>
          <div className="preset-assignment">
            <label className="field" title={help['bank.assign']}>
              <span>Assign to Instrument</span>
              <select
                aria-label={`Assign preset ${reference.id}`}
                value={assignmentTarget}
                onChange={(event) => onTargetChange(event.currentTarget.value)}
              >
                {composition.instruments.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={!preset} onClick={() => preset && onAssign(preset)} title={help['bank.usePreset']}>
              Use preset
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
