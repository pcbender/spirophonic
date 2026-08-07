import type { PlaybackStatus } from '../audio/performanceScheduler'
import { help } from './help'

export type TransportProps = {
  status: PlaybackStatus
  looping: boolean
  positionSeconds: number
  startSeconds: number
  durationSeconds: number
  eventCount: number
  /** True while a newer performance is still compiling off the render thread. */
  compiling?: boolean
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
  compiling,
  pendingBoundarySeconds,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onLoopChange,
}: TransportProps) {
  const playing = status === 'playing'
  const endSeconds = startSeconds + durationSeconds

  return (
    <div className="transport" aria-label="Composition transport">
      <button type="button" title={help['transport.play']} onClick={playing ? onPause : onPlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" title={help['transport.stop']} onClick={onStop}>Stop</button>
      <label className="sound-toggle" title={help['transport.loop']}>
        <input
          type="checkbox"
          checked={looping}
          onChange={(event) => onLoopChange(event.currentTarget.checked)}
        />
        Loop
      </label>
      <input
        aria-label="Transport position"
        title={help['transport.position']}
        type="range"
        min={startSeconds}
        max={endSeconds}
        step={0.001}
        value={Math.min(endSeconds, Math.max(startSeconds, positionSeconds))}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
      />
      <output aria-label="Transport status" title={help['transport.status']}>
        {positionSeconds.toFixed(2)}s · {eventCount} events
        {compiling ? ' · compiling…' : ''}
      </output>
      {pendingBoundarySeconds !== null && (
        <output aria-label="Pending edit">
          Pending edit at {pendingBoundarySeconds.toFixed(2)}s
        </output>
      )}
    </div>
  )
}
