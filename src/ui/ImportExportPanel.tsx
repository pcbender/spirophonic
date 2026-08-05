import { useMemo, useRef, useState } from 'react'

import type { Composition } from '../core/composition'
import { referenceComposition } from '../core/defaultComposition'
import type { CanonicalPerformance } from '../core/performance'
import {
  downloadCompositionJson,
  parseCompositionJson,
} from '../export/compositionJson'
import { downloadPerformanceMidi } from '../export/midiExport'
import { exportPerformanceStrudel } from '../export/strudelExport'
import { downloadCompositionSvg } from '../export/svgExport'

export type ImportExportPanelProps = {
  composition: Composition
  performance: CanonicalPerformance
  onImport: (composition: Composition) => void
}

export function ImportExportPanel({
  composition,
  performance,
  onImport,
}: ImportExportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [message, setMessage] = useState('')
  const strudel = useMemo(
    () => exportPerformanceStrudel(performance, composition),
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
    await navigator.clipboard?.writeText(strudel)
    setMessage('Copied Strudel snippet.')
  }

  return (
    <section className="import-export" aria-label="Import and export">
      <button type="button" onClick={() => downloadCompositionJson(composition)}>
        Export JSON
      </button>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import JSON
      </button>
      <button
        type="button"
        onClick={() =>
          onImport(structuredClone(referenceComposition) as Composition)
        }
      >
        Load reference
      </button>
      <button type="button" onClick={() => downloadPerformanceMidi(performance, composition)}>
        Export MIDI
      </button>
      <button type="button" onClick={() => downloadCompositionSvg(composition, observation)}>
        Export SVG
      </button>
      <button type="button" onClick={() => void copyStrudel()}>
        Copy Strudel
      </button>
      <input
        ref={inputRef}
        aria-label="Import Composition JSON"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void handleImport(event.currentTarget.files?.[0])}
      />
      <output aria-live="polite">{message}</output>
    </section>
  )
}
