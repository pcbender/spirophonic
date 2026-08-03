import { useMemo, useState } from 'react'
import type { SpirophonicModel } from '../core/model'
import { exportStrudelSnippet } from '../export/strudelExport'

type StrudelExportPanelProps = {
  model: SpirophonicModel
}

export function StrudelExportPanel({ model }: StrudelExportPanelProps) {
  const snippet = useMemo(() => exportStrudelSnippet(model), [model])
  const [copyStatus, setCopyStatus] = useState('')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopyStatus('Copied.')
  }

  return (
    <section className="strudel-panel" aria-label="Strudel snippet export">
      <div className="panel-header">
        <h2>Strudel</h2>
        <button
          type="button"
          title="Copy a Strudel snippet of these voices."
          onClick={() => void handleCopy()}
        >
          Copy
        </button>
      </div>
      <pre>{snippet}</pre>
      <output aria-live="polite">{copyStatus}</output>
    </section>
  )
}
