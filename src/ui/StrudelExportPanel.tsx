import { useMemo, useState } from 'react'
import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/spirograph'
import { exportStrudelSnippet } from '../export/strudelExport'

type StrudelExportPanelProps = {
  model: SpirophonicModel
  points: Array<SpiroPoint>
}

export function StrudelExportPanel({
  model,
  points,
}: StrudelExportPanelProps) {
  const snippet = useMemo(
    () => exportStrudelSnippet(model, points),
    [model, points],
  )
  const [copyStatus, setCopyStatus] = useState('')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopyStatus('Copied.')
  }

  return (
    <section className="strudel-panel" aria-label="Strudel snippet export">
      <div className="panel-header">
        <h2>Strudel</h2>
        <button type="button" onClick={() => void handleCopy()}>
          Copy
        </button>
      </div>
      <pre>{snippet}</pre>
      <output aria-live="polite">{copyStatus}</output>
    </section>
  )
}

