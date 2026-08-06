import { useState } from 'react'

import type { Composition } from '../core/composition'
import type { CanonicalPerformance } from '../core/performance'
import {
  createRecording,
  provenanceWarnings,
  type Recording,
} from '../core/recording'
import { replayRecording } from '../core/replay'
import { exportRecordingToJson } from '../export/recordingJson'

export type RecorderPanelProps = {
  composition: Composition
  performance: CanonicalPerformance
  positionSeconds: number
}

const download = (recording: Recording) => {
  const blob = new Blob([exportRecordingToJson(recording)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${recording.id}.recording.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function RecorderPanel({
  composition,
  performance,
  positionSeconds,
}: RecorderPanelProps) {
  const [recording, setRecording] = useState<Recording | null>(null)
  const [startSeconds, setStartSeconds] = useState<number | null>(null)

  const start = () => setStartSeconds(positionSeconds)

  const stop = () => {
    if (startSeconds === null) return
    const captured = createRecording({
      id: `recording-${composition.id}`,
      name: `${composition.name} take`,
      composition,
      performance,
      window: {
        startSeconds: Math.min(startSeconds, positionSeconds),
        endSeconds: Math.max(startSeconds, positionSeconds),
      },
      recordedAt: new Date().toISOString(),
    })
    setStartSeconds(null)
    setRecording(captured)
  }

  const replayed = recording ? replayRecording(recording) : null
  const warnings = recording ? provenanceWarnings(recording) : []

  return (
    <section className="control-panel" aria-label="Recorder">
      <div className="panel-header">
        <h2>Recorder</h2>
        <div className="panel-actions">
          <button type="button" onClick={start} disabled={startSeconds !== null}>
            Record
          </button>
          <button type="button" onClick={stop} disabled={startSeconds === null}>
            Stop
          </button>
        </div>
      </div>

      {startSeconds !== null && (
        <p className="panel-context">
          Recording from {startSeconds.toFixed(2)}s. Move the Transport, then
          stop.
        </p>
      )}

      {!recording ? (
        <p>No Recording yet.</p>
      ) : (
        <>
          <p className="panel-context">
            {recording.encounters.length} Encounters,{' '}
            {recording.performedEvents.length} performed events, engine version{' '}
            {recording.provenance.engineVersion}.
          </p>
          {recording.truncations.map((truncation) => (
            <p key={truncation.layer} role="alert">
              {truncation.message}
            </p>
          ))}
          {warnings.map((warning) => (
            <p key={warning.code} role="alert">
              {warning.message}
            </p>
          ))}
          <p className="panel-context">
            Replay yields {replayed?.events.length ?? 0} events without
            re-evaluating geometry.
          </p>
          <div className="panel-actions">
            <button type="button" onClick={() => download(recording)}>
              Export Recording
            </button>
            <button type="button" onClick={() => setRecording(null)}>
              Discard
            </button>
          </div>
        </>
      )}
    </section>
  )
}
