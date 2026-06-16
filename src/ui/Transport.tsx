type TransportProps = {
  isPlaying: boolean
  soundEnabled: boolean
  continuousPlay: boolean
  progress: number
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onSoundToggle: (enabled: boolean) => void
  onContinuousPlayToggle: (enabled: boolean) => void
}

export function Transport({
  isPlaying,
  soundEnabled,
  continuousPlay,
  progress,
  onPlay,
  onPause,
  onReset,
  onSoundToggle,
  onContinuousPlayToggle,
}: TransportProps) {
  return (
    <div className="transport" aria-label="Animation transport">
      <button
        type="button"
        title="Start or pause the animated trace."
        onClick={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        title="Return animation progress to the beginning."
        onClick={onReset}
      >
        Reset
      </button>
      <label
        className="sound-toggle"
        title="Enable a quiet WebAudio oscillator controlled by the current trace point."
      >
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(event) => onSoundToggle(event.currentTarget.checked)}
        />
        Sound
      </label>
      <label
        className="sound-toggle"
        title="When enabled, animation loops continuously. When disabled, it stops at the next completed cycle."
      >
        <input
          type="checkbox"
          checked={continuousPlay}
          onChange={(event) =>
            onContinuousPlayToggle(event.currentTarget.checked)
          }
        />
        Continuous
      </label>
      <div className="progress-meter" aria-label="Cycle progress">
        <span style={{ inlineSize: `${Math.round(progress * 100)}%` }} />
      </div>
      <output>{Math.round(progress * 100)}%</output>
    </div>
  )
}
