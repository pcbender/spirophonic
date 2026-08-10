import { useMemo, useRef, useState } from 'react'

import type { SoundBankStore } from '../audio/soundbankStore'
import type { Composition } from '../core/composition'
import type { CanonicalPerformance } from '../core/performance'
import { help } from './help'
import { ModalDialog } from './ModalDialog'
import {
  estimateRenderBytes,
  renderPerformanceToWav,
  RenderCancelledError,
  type RenderProgress,
} from '../export/audioRender'
import {
  downloadCompositionJson,
  parseCompositionJson,
} from '../export/compositionJson'
import { downloadPerformanceMidi } from '../export/midiExport'
import {
  createProjectBundle,
  downloadProjectBundle,
  importProjectBundle,
  parseProjectBundle,
  type BundleAssetOutcome,
} from '../export/projectBundle'
import { exportPerformanceStrudelWithDiagnostics } from '../export/strudelExport'
import { downloadCompositionSvg } from '../export/svgExport'

export type ImportExportPanelProps = {
  composition: Composition
  performance: CanonicalPerformance
  onImport: (composition: Composition) => void
  /** The local sound-bank vault, needed to render or bundle SoundFont banks. */
  vault?: SoundBankStore
}

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`

type BundleSizeProps = {
  embedding: boolean
  banks: Readonly<{
    available: number
    referenced: number
    bytes: number
  }> | null
}

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * Sizes a bundle in the unit that reads. Banks run from a few kilobytes to
 * tens of megabytes, and a small one shown as "0.0 MB" reads as free rather
 * than small.
 */
const approximateSize = (bytes: number) =>
  bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** What the choice costs, in the only unit that decides it. */
function BundleSize({ embedding, banks }: BundleSizeProps) {
  if (!banks || banks.referenced === 0) return null
  const missing = banks.referenced - banks.available

  if (!embedding) {
    return (
      <p className="bundle-size" aria-live="polite">
        {plural(banks.referenced, 'bank reference')}, no audio — a few
        kilobytes.
      </p>
    )
  }

  return (
    <p className="bundle-size" aria-live="polite">
      {banks.available === 0
        ? `None of the ${plural(banks.referenced, 'referenced bank')} are in this browser's vault yet, so nothing can be embedded. The bundle will be a manifest.`
        : `Embedding ${
            missing === 0
              ? plural(banks.available, 'bank')
              : `${banks.available} of ${plural(banks.referenced, 'referenced bank')}`
          } adds about ${approximateSize(banks.bytes)}.`}
      {missing > 0 && banks.available > 0
        ? ` The other ${missing} ${missing === 1 ? 'is' : 'are'} not in the vault and cannot be embedded.`
        : ''}
    </p>
  )
}

export function ImportExportPanel({
  composition,
  performance,
  onImport,
  vault,
}: ImportExportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const bundleInputRef = useRef<HTMLInputElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<RenderProgress | null>(null)
  const [assetReport, setAssetReport] = useState<
    ReadonlyArray<BundleAssetOutcome>
  >([])
  const [embedBanks, setEmbedBanks] = useState(false)
  const [bundleOpen, setBundleOpen] = useState(false)
  const [bankBytes, setBankBytes] = useState<Readonly<{
    available: number
    referenced: number
    bytes: number
  }> | null>(null)

  const strudel = useMemo(
    () => exportPerformanceStrudelWithDiagnostics(performance, composition),
    [composition, performance],
  )
  const observation = {
    startSeconds: performance.request.startSeconds,
    endSeconds:
      performance.request.startSeconds + performance.request.durationSeconds,
    sampleRateHz: performance.request.sampleRateHz,
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return

    const result = parseCompositionJson(await file.text())
    if (result.ok) {
      onImport(result.composition)
      setMessage(`Imported ${result.composition.name}.`)
    } else {
      const detail = result.issues?.[0]
      setMessage(
        detail ? `${result.error} ${detail.path}: ${detail.message}` : result.error,
      )
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const copyStrudel = async () => {
    await navigator.clipboard?.writeText(strudel.code)
    setMessage(
      ['Copied Strudel snippet.', ...strudel.diagnostics.map((item) => item.message)].join(' '),
    )
  }

  const exportMidi = () => {
    const result = downloadPerformanceMidi(performance, composition)
    setMessage(
      result.diagnostics.length === 0
        ? 'Exported MIDI with exact supported modulation.'
        : result.diagnostics.map((item) => item.message).join(' '),
    )
  }

  const exportWav = async () => {
    if (progress) return
    const controller = new AbortController()
    abortRef.current = controller
    setAssetReport([])
    setMessage(
      `Rendering about ${megabytes(
        estimateRenderBytes(performance.request.durationSeconds + 2),
      )} of audio.`,
    )

    try {
      const result = await renderPerformanceToWav({
        composition,
        performance,
        store: vault,
        signal: controller.signal,
        onProgress: setProgress,
      })

      const blob = new Blob([result.wav.bytes], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${composition.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'composition'}.wav`
      anchor.click()
      URL.revokeObjectURL(url)

      const reproducibility =
        result.determinism === 'deterministic'
          ? 'Repeat renders are identical.'
          : 'SoundFont voices may differ slightly between renders.'
      setMessage(
        [
          `Rendered ${result.renderedEventCount} events over ${result.durationSeconds.toFixed(1)}s.`,
          reproducibility,
          ...result.issues,
        ].join(' '),
      )
    } catch (error) {
      setMessage(
        error instanceof RenderCancelledError
          ? 'Render cancelled.'
          : `Render failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
      )
    } finally {
      abortRef.current = null
      setProgress(null)
    }
  }

  /**
   * Measures what embedding would actually cost, for the digests this
   * Composition references. A number beats a warning: "adds about 38.1 MB" is
   * a decision you can make, "much larger file" is not.
   */
  const measureBanks = async () => {
    setBankBytes(null)
    if (!vault || composition.soundBanks.length === 0) return
    try {
      const stored = await vault.list()
      const wanted = new Set(
        composition.soundBanks.map((reference) => reference.digest),
      )
      const held = stored.filter((metadata) => wanted.has(metadata.digest))
      setBankBytes({
        available: held.length,
        referenced: wanted.size,
        bytes: held.reduce((total, metadata) => total + metadata.byteLength, 0),
      })
    } catch {
      // Only the size hint is lost; the export itself does not depend on it.
    }
  }

  const openBundleDialog = () => {
    setBundleOpen(true)
    void measureBanks()
  }

  const exportBundle = async () => {
    setAssetReport([])
    setBundleOpen(false)
    const result = await createProjectBundle({
      composition,
      store: vault,
      mayEmbed: () => embedBanks,
    })
    downloadProjectBundle(result)
    setMessage(
      [
        `Bundled ${result.bundle.assets.length} sound bank references`,
        result.embeddedDigests.length > 0
          ? `with ${result.embeddedDigests.length} embedded.`
          : 'as a manifest only.',
        ...result.issues,
      ].join(' '),
    )
  }

  const importBundle = async (file: File | undefined) => {
    if (!file) return
    setAssetReport([])

    const parsed = parseProjectBundle(await file.text())
    if (!parsed.ok) {
      setMessage(parsed.issues.join(' '))
      if (bundleInputRef.current) bundleInputRef.current.value = ''
      return
    }

    const result = await importProjectBundle(parsed.bundle, { store: vault })
    onImport(result.composition)
    setAssetReport(result.assets)
    setMessage(
      result.playable
        ? `Restored ${result.composition.name}; every sound bank is available.`
        : `Restored ${result.composition.name}, but ${result.missingDigests.length} sound bank(s) are missing. It will not sound complete until they are imported.`,
    )
    if (bundleInputRef.current) bundleInputRef.current.value = ''
  }

  return (
    <section className="import-export" aria-label="Import and export">
      <button type="button" title={help['files.exportJson']} onClick={() => downloadCompositionJson(composition)}>
        Export JSON
      </button>
      <button type="button" title={help['files.importJson']} onClick={() => inputRef.current?.click()}>
        Import JSON
      </button>
      <button type="button" title={help['files.exportMidi']} onClick={exportMidi}>
        Export MIDI
      </button>
      <button type="button" title={help['files.exportSvg']} onClick={() => downloadCompositionSvg(composition, observation)}>
        Export SVG
      </button>
      <button type="button" title={help['files.copyStrudel']} onClick={() => void copyStrudel()}>
        Copy Strudel
      </button>
      <button type="button" title={help['files.exportWav']} disabled={progress !== null} onClick={() => void exportWav()}>
        {progress ? 'Rendering…' : 'Export WAV'}
      </button>
      {progress ? (
        <button type="button" title={help['files.cancelRender']} onClick={() => abortRef.current?.abort()}>
          Cancel render
        </button>
      ) : null}
      <button
        type="button"
        title={help['files.exportBundle']}
        onClick={openBundleDialog}
      >
        Export bundle
      </button>
      <button
        type="button"
        title={help['files.importBundle']}
        onClick={() => bundleInputRef.current?.click()}
      >
        Import bundle
      </button>
      {/*
        The embed choice governs Export bundle alone, so it lives with that
        button rather than in the top bar. It is read once, when you export,
        and there is no reason to look at it the rest of the time.
      */}
      <ModalDialog
        open={bundleOpen}
        onClose={() => setBundleOpen(false)}
        title="Export bundle"
        actions={
          <button
            type="button"
            className="primary"
            title={help['files.exportBundle']}
            onClick={() => void exportBundle()}
          >
            Export bundle
          </button>
        }
      >
        <p className="settings-note">
          A bundle is the whole project in one <code>.spirophonic</code> file:
          the Composition, plus how it reaches its sound banks.
        </p>
        <label className="embed-banks" title={help['files.embedBanks']}>
          <input
            type="checkbox"
            checked={embedBanks}
            onChange={(event) => setEmbedBanks(event.currentTarget.checked)}
          />
          Embed sound banks in bundle
        </label>
        <p className="settings-note">
          {embedBanks
            ? 'The bundle carries the bank audio and opens on any machine.'
            : 'The bundle names banks by digest and expects them already in the vault. It opens anywhere, but only sounds complete where those banks are present.'}
        </p>
        <BundleSize embedding={embedBanks} banks={bankBytes} />
      </ModalDialog>
      <input
        ref={inputRef}
        aria-label="Import Composition JSON"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void handleImport(event.currentTarget.files?.[0])}
      />
      <input
        ref={bundleInputRef}
        aria-label="Import Spirophonic bundle"
        type="file"
        accept=".spirophonic,application/json"
        hidden
        onChange={(event) => void importBundle(event.currentTarget.files?.[0])}
      />
      {progress ? (
        <progress
          aria-label="Render progress"
          value={progress.fraction}
          max={1}
        />
      ) : null}
      <output aria-live="polite">{message}</output>
      {assetReport.length > 0 ? (
        <ul className="asset-report" aria-label="Sound bank results">
          {assetReport.map((asset) => (
            <li key={`${asset.soundBankId}-${asset.digest}`} data-status={asset.status}>
              {asset.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
