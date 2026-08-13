import { useState } from 'react'

import { type BundledBankState } from '../audio/bundledSoundBank'
import type {
  Composition,
  SoundBankFormat,
  SoundBankReference,
} from '../core/composition'
import type {
  SoundBankImport,
  SoundBankStore,
  StoredSoundBankMetadata,
} from '../audio/soundbankStore'
import { help } from './help'
import {
  errorMessage,
  type BankView,
  type SoundBankViews,
} from './useSoundBankViews'

/**
 * Bank management: importing, provenance, relinking, and removing bytes.
 *
 * Everything here is setup — done once per bank, then not again. The controls
 * that are used constantly (find, audition, assign) stay in the rail panel, so
 * that the rail is only ever the working surface.
 */

export type SoundBankVault = Pick<
  SoundBankStore,
  'importBank' | 'relink' | 'delete' | 'toReference'
>

export type SoundBankSettingsProps = {
  composition: Composition
  /** Progress of the bundled General MIDI bank, which arrives on its own. */
  bundledBankState?: BundledBankState
  onChange: (composition: Composition) => void
  vault: SoundBankVault
  banks: SoundBankViews
  invalidateBank: (soundBankId: string) => void
}

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

export function SoundBankSettings({
  composition,
  bundledBankState,
  onChange,
  vault,
  banks,
  invalidateBank,
}: SoundBankSettingsProps) {
  const [file, setFile] = useState<File | null>(null)
  const [license, setLicense] = useState(
    'User supplied — redistribution not granted',
  )
  const [attribution, setAttribution] = useState('')
  const [message, setMessage] = useState('No local bank selected.')

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
      const presets = await banks.refresh(reference)
      setMessage(
        imported.created
          ? `Imported ${reference.name}: ${presets.length} presets ready. Assign a preset in the Sound banks panel.`
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
      const presets = await banks.refresh(reference)
      setMessage(`Relinked ${reference.name}: ${presets.length} presets ready.`)
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  const removeLocalBytes = async (reference: SoundBankReference) => {
    try {
      await vault.delete(reference.digest)
      invalidateBank(reference.id)
      banks.setView(reference.id, {
        state: 'missing',
        presets: [],
        message: `${reference.name} was removed locally. Relink to play it.`,
      })
      setMessage(
        `Removed local bytes for ${reference.name}; its Composition reference remains.`,
      )
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  return (
    <section className="settings-section" aria-label="Sound bank settings">
      <h3>Sound banks</h3>
      <p className="settings-note">
        Banks live in this browser, not in the Composition — which stores only a
        digest, a licence, and an attribution. Add preset Instruments in
        the Sound banks panel.
      </p>
      <div className="sound-bank-import">
        <label className="field" title={help['bank.file']}>
          <span>SF2 or SF3 file</span>
          <input
            aria-label="SoundFont file"
            type="file"
            accept=".sf2,.sf3"
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <label className="field" title={help['bank.license']}>
          <span>License / usage terms</span>
          <input
            aria-label="SoundFont license"
            value={license}
            onChange={(event) => setLicense(event.currentTarget.value)}
          />
        </label>
        <label className="field" title={help['bank.attribution']}>
          <span>Provenance / attribution</span>
          <input
            aria-label="SoundFont attribution"
            value={attribution}
            onChange={(event) => setAttribution(event.currentTarget.value)}
          />
        </label>
        <button
          type="button"
          title={help['bank.import']}
          onClick={() => void importSelected()}
        >
          Import local bank
        </button>
      </div>
      {bundledBankState && bundledBankState.state !== 'present' ? (
        <p className="bundled-bank-status" aria-live="polite">
          {bundledBankState.state === 'fetching'
            ? 'Downloading the bundled MuseScore General bank (38 MB). Native Instruments play meanwhile.'
            : bundledBankState.state === 'failed'
              ? bundledBankState.message
              : ''}
        </p>
      ) : null}
      <output aria-live="polite">{message}</output>
      <ol className="sound-bank-list">
        {composition.soundBanks.map((reference) => (
          <BankCard
            key={reference.id}
            reference={reference}
            view={banks.views[reference.id] ?? { state: 'loading', presets: [] }}
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
  view: BankView
  onRelink: (file: File) => void
  onRemove: () => void
}

function BankCard({ reference, view, onRelink, onRemove }: BankCardProps) {
  return (
    <li className="sound-bank-card">
      <div className="voice-head">
        <strong>{reference.name}</strong>
        <span className={`bank-state bank-state-${view.state}`}>
          {view.state}
        </span>
      </div>
      <dl>
        <div><dt>Format</dt><dd>{reference.format.toUpperCase()}</dd></div>
        <div><dt>Digest</dt><dd><code>{reference.digest.slice(0, 16)}…</code></dd></div>
        <div><dt>Source</dt><dd>{reference.source}</dd></div>
        <div><dt>License</dt><dd>{reference.license}</dd></div>
        <div><dt>Attribution</dt><dd>{reference.attribution || 'None recorded'}</dd></div>
      </dl>
      {view.state !== 'ready' && view.state !== 'loading' ? (
        <p role="alert">{view.message}</p>
      ) : null}
      <div className="panel-actions">
        <label className="relink-button">
          Relink bank
          <input
            title={help['bank.relink']}
            aria-label={`Relink ${reference.id}`}
            type="file"
            accept={`.${reference.format}`}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0]
              if (selected) onRelink(selected)
            }}
          />
        </label>
        <button type="button" onClick={onRemove} title={help['bank.removeBytes']}>
          Remove local bytes
        </button>
      </div>
    </li>
  )
}
