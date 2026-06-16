import { useRef, useState } from 'react'
import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/spirograph'
import { downloadModelJson, parseModelJson } from '../export/jsonExport'
import { downloadTraceSvg } from '../export/svgExport'

type ImportExportPanelProps = {
  model: SpirophonicModel
  points: Array<SpiroPoint>
  onImport: (model: SpirophonicModel) => void
}

export function ImportExportPanel({
  model,
  points,
  onImport,
}: ImportExportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [message, setMessage] = useState('')

  const handleImport = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const result = parseModelJson(await file.text())

    if (result.ok) {
      onImport(result.model)
      setMessage(`Imported ${result.model.name}.`)
    } else {
      setMessage(result.error)
    }

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="import-export" aria-label="Import and export">
      <button type="button" onClick={() => downloadModelJson(model)}>
        Export JSON
      </button>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import JSON
      </button>
      <button type="button" onClick={() => downloadTraceSvg(model, points)}>
        Export SVG
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => void handleImport(event.currentTarget.files?.[0])}
      />
      <output aria-live="polite">{message}</output>
    </div>
  )
}
