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
        title="Runs the pen around the curve. Visually the trace draws itself and the active point moves; sonically it drives the live trace tone if Sound is on. Separate from Preview, which loops the composed parts. Space bar also works."
        onClick={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        title="Sends the pen back to the start of the curve and stops. Visually the trace clears to its first point; sonically the live tone stops."
        onClick={onReset}
      >
        Reset
      </button>
      <label
        className="sound-toggle"
        title="A quiet tone that follows the moving trace point, gliding continuously rather than playing notes. Sonically it is the curve heard as one sweeping line — the Sound controls shape it. Unrelated to the voices, which play discrete notes."
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
        title="Whether the trace loops forever or halts once the curve closes. Visually a continuous redraw against a single pass; sonically the live tone either keeps sweeping or stops at the end of the cycle."
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
