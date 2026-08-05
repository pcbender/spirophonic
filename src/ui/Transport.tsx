import type { PlaybackStatus } from '../audio/performanceScheduler'

export type TransportProps = {
  status: PlaybackStatus
  looping: boolean
  positionSeconds: number
  startSeconds: number
  durationSeconds: number
  eventCount: number
  pendingBoundarySeconds: number | null
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (positionSeconds: number) => void
  onLoopChange: (looping: boolean) => void
}

export function Transport({
  status,
  looping,
  positionSeconds,
  startSeconds,
  durationSeconds,
  eventCount,
  pendingBoundarySeconds,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onLoopChange,
}: TransportProps) {
  const playing = status === 'playing'
  const endSeconds = startSeconds + durationSeconds
  const progress = Math.min(
    1,
    Math.max(0, (positionSeconds - startSeconds) / durationSeconds),
  )

  return (
    <div className="transport" aria-label="Composition transport">
      <button type="button" onClick={playing ? onPause : onPlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={onStop}>Stop</button>
      <label className="sound-toggle">
        <input
          type="checkbox"
          checked={looping}
          onChange={(event) => onLoopChange(event.currentTarget.checked)}
        />
        Loop
      </label>
      <input
        aria-label="Transport position"
        type="range"
        min={startSeconds}
        max={endSeconds}
        step={0.001}
        value={Math.min(endSeconds, Math.max(startSeconds, positionSeconds))}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
      />
      <div className="progress-meter" aria-label="Loop progress">
        <span style={{ inlineSize: `${Math.round(progress * 100)}%` }} />
      </div>
      <output aria-label="Transport status">
        {positionSeconds.toFixed(2)}s · {eventCount} events
      </output>
      {pendingBoundarySeconds !== null && (
        <output aria-label="Pending edit">
          Pending edit at {pendingBoundarySeconds.toFixed(2)}s
        </output>
      )}
    </div>
  )
}
