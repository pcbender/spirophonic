import { useEffect, useMemo, useState } from 'react'

import type {
  Composition,
  SoundBankFormat,
  SoundBankReference,
  SoundFontInstrumentSpec,
} from '../core/composition'
import type {
  SoundBankImport,
  SoundBankStore,
  StoredSoundBankMetadata,
} from '../audio/soundbankStore'
import {
  soundFontBankNumber,
  type SoundFontPreset,
} from '../audio/soundfontEngine'

export type SoundBankVault = Pick<
  SoundBankStore,
  'importBank' | 'relink' | 'delete' | 'toReference'
>

export type SoundBankPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
  vault: SoundBankVault
  inspectBank: (
    reference: SoundBankReference,
  ) => Promise<ReadonlyArray<SoundFontPreset>>
  audition: (
    reference: SoundBankReference,
    preset: SoundFontPreset,
    note: number,
  ) => Promise<void>
  invalidateBank: (soundBankId: string) => void
}

type BankView =
  | { state: 'loading'; presets: ReadonlyArray<SoundFontPreset> }
  | { state: 'ready'; presets: ReadonlyArray<SoundFontPreset> }
  | {
      state: 'missing' | 'unsupported' | 'failed'
      presets: ReadonlyArray<SoundFontPreset>
      message: string
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

const formatFor = (fileName: string): SoundBankFormat | undefined => {
  const extension = fileName.toLowerCase().split('.').at(-1)
  return extension === 'sf2' || extension === 'sf3' ? extension : undefined
}

const bankIdFor = (
  metadata: StoredSoundBankMetadata,
  references: ReadonlyArray<SoundBankReference>,
) => {
  const held = references.find(
    (reference) => reference.digest === metadata.digest,
  )
  if (held) return held.id
  const base = `bank-${metadata.digest.slice(0, 12)}`
  if (!references.some((reference) => reference.id === base)) return base
  return `bank-${metadata.digest.slice(0, 20)}`
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export function SoundBankPanel({
  composition,
  onChange,
  vault,
  inspectBank,
  audition,
  invalidateBank,
}: SoundBankPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [license, setLicense] = useState(
    'User supplied — redistribution not granted',
  )
  const [attribution, setAttribution] = useState('')
  const [message, setMessage] = useState('No local bank selected.')
  const [views, setViews] = useState<Record<string, BankView>>({})
  const [selectedPreset, setSelectedPreset] = useState<Record<string, number>>(
    {},
  )
  const [assignmentTarget, setAssignmentTarget] = useState<
    Record<string, string>
  >({})
  const [search, setSearch] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    for (const reference of composition.soundBanks) {
      void inspectBank(reference)
        .then((presets) => {
          if (cancelled) return
          setViews((current) => ({
            ...current,
            [reference.id]: { state: 'ready', presets },
          }))
          setSelectedPreset((current) => ({
            ...current,
            [reference.id]: current[reference.id] ?? 0,
          }))
        })
        .catch((error) => {
          if (cancelled) return
          const text = errorMessage(error)
          setViews((current) => ({
            ...current,
            [reference.id]: {
              state: text.includes('not in local storage')
                ? 'missing'
                : text.includes('unsupported')
                  ? 'unsupported'
                  : 'failed',
              presets: [],
              message: text,
            },
          }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [composition.soundBanks, inspectBank])

  const importSelected = async () => {
    if (!file) {
      setMessage('Choose an SF2 or SF3 file first.')
      return
    }
    const format = formatFor(file.name)
    if (!format) {
      setMessage('Unsupported bank. Choose an .sf2 or .sf3 file.')
      return
    }
    if (!license.trim()) {
      setMessage('Record the bank license before importing it.')
      return
    }

    setMessage(`Importing ${file.name}…`)
    try {
      const imported = await vault.importBank({
        bytes: file,
        name: file.name,
        format,
        license: license.trim(),
        attribution: attribution.trim(),
      })
      const id = bankIdFor(imported.metadata, composition.soundBanks)
      const reference = vault.toReference(id, imported.metadata)
      const nextReferences = composition.soundBanks.some(
        (held) => held.digest === reference.digest,
      )
        ? composition.soundBanks
        : [...composition.soundBanks, reference]
      onChange({ ...composition, soundBanks: nextReferences })
      invalidateBank(reference.id)
      const presets = await inspectBank(reference)
      setViews((current) => ({
        ...current,
        [reference.id]: { state: 'ready', presets },
      }))
      setSelectedPreset((current) => ({
        ...current,
        [reference.id]: 0,
      }))
      setMessage(
        imported.created
          ? `Imported ${reference.name}: ${presets.length} presets ready.`
          : `${reference.name} was already in the local vault.`,
      )
      setFile(null)
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  const relink = async (reference: SoundBankReference, selected: File) => {
    const format = formatFor(selected.name)
    if (!format || format !== reference.format) {
      setMessage(`Choose a matching .${reference.format} bank for relink.`)
      return
    }
    setMessage(`Relinking ${reference.name}…`)
    const input: SoundBankImport = {
      bytes: selected,
      name: reference.name,
      format,
      license: reference.license,
      attribution: reference.attribution,
    }
    try {
      await vault.relink(reference.digest, input)
      invalidateBank(reference.id)
      const presets = await inspectBank(reference)
      setViews((current) => ({
        ...current,
        [reference.id]: { state: 'ready', presets },
      }))
      setMessage(`Relinked ${reference.name}: ${presets.length} presets ready.`)
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  const removeLocalBytes = async (reference: SoundBankReference) => {
    try {
      await vault.delete(reference.digest)
      invalidateBank(reference.id)
      setViews((current) => ({
        ...current,
        [reference.id]: {
          state: 'missing',
          presets: [],
          message: `${reference.name} was removed locally. Relink to play it.`,
        },
      }))
      setMessage(
        `Removed local bytes for ${reference.name}; its Composition reference remains.`,
      )
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  const assign = (
    reference: SoundBankReference,
    preset: SoundFontPreset,
  ) => {
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
    <section className="control-panel sound-bank-panel" aria-label="Sound banks">
      <h2>Sound banks</h2>
      <div className="sound-bank-import">
        <label className="field">
          <span>SF2 or SF3 file</span>
          <input
            aria-label="SoundFont file"
            type="file"
            accept=".sf2,.sf3"
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <label className="field">
          <span>License / usage terms</span>
          <input
            aria-label="SoundFont license"
            value={license}
            onChange={(event) => setLicense(event.currentTarget.value)}
          />
        </label>
        <label className="field">
          <span>Provenance / attribution</span>
          <input
            aria-label="SoundFont attribution"
            value={attribution}
            onChange={(event) => setAttribution(event.currentTarget.value)}
          />
        </label>
        <button type="button" onClick={() => void importSelected()}>
          Import local bank
        </button>
      </div>
      <output aria-live="polite">{message}</output>
      <ol className="sound-bank-list">
        {composition.soundBanks.map((reference) => (
          <BankCard
            key={reference.id}
            reference={reference}
            composition={composition}
            view={views[reference.id] ?? { state: 'loading', presets: [] }}
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
            onRelink={(selected) => void relink(reference, selected)}
            onRemove={() => void removeLocalBytes(reference)}
          />
        ))}
      </ol>
    </section>
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
  onRelink: (file: File) => void
  onRemove: () => void
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
  onRelink,
  onRemove,
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
      <dl>
        <div><dt>Format</dt><dd>{reference.format.toUpperCase()}</dd></div>
        <div><dt>Digest</dt><dd><code>{reference.digest.slice(0, 16)}…</code></dd></div>
        <div><dt>Source</dt><dd>{reference.source}</dd></div>
        <div><dt>License</dt><dd>{reference.license}</dd></div>
        <div><dt>Attribution</dt><dd>{reference.attribution || 'None recorded'}</dd></div>
      </dl>
      {view.state === 'ready' ? (
        <>
          <label className="field">
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
                aria-label={`Audition ${noteName(note)} ${reference.id}`}
                onClick={() => preset && onAudition(preset, note)}
              >
                {noteName(note)}
              </button>
            ))}
          </div>
          <div className="preset-assignment">
            <label className="field">
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
            <button type="button" disabled={!preset} onClick={() => preset && onAssign(preset)}>
              Use preset
            </button>
          </div>
        </>
      ) : view.state === 'loading' ? (
        <p>Loading bank and enumerating presets…</p>
      ) : (
        <p role="alert">{view.message}</p>
      )}
      <div className="panel-actions">
        <label className="relink-button">
          Relink bank
          <input
            aria-label={`Relink ${reference.id}`}
            type="file"
            accept={`.${reference.format}`}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0]
              if (selected) onRelink(selected)
            }}
          />
        </label>
        <button type="button" onClick={onRemove}>Remove local bytes</button>
      </div>
    </li>
  )
}
