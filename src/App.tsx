import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { WebAudioEngine } from './audio/webAudioEngine'
import { defaultModel } from './core/defaultModel'
import type { SpirophonicModel } from './core/model'
import { generateSpiroPoints } from './core/trochoid'
import { getEffectiveCyclesPerSecond } from './core/time'
import { CanvasView } from './ui/CanvasView'
import { ControlPanel } from './ui/ControlPanel'
import { ImportExportPanel } from './ui/ImportExportPanel'
import { PresetPicker } from './ui/PresetPicker'
import { StrudelExportPanel } from './ui/StrudelExportPanel'
import { Transport } from './ui/Transport'

function App() {
  const [model, setModel] = useState<SpirophonicModel>(defaultModel)
  const [isPlaying, setIsPlaying] = useState(false)
  const [continuousPlay, setContinuousPlay] = useState(true)
  const [progress, setProgress] = useState(1)
  const progressRef = useRef(progress)
  const audioRef = useRef<WebAudioEngine | null>(null)
  const points = useMemo(() => generateSpiroPoints(model), [model])
  const activeIndex = Math.floor(progress * Math.max(0, points.length - 1))
  const activePoint = points[activeIndex] ?? points[0]
  const cyclesPerSecond = getEffectiveCyclesPerSecond(
    model.time.cyclesPerSecond,
  )

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    let frameId = 0
    const startTime = performance.now()
    const startProgress = progressRef.current

    const animate = (timestamp: number) => {
      const elapsedSeconds = (timestamp - startTime) / 1000
      const rawProgress = startProgress + elapsedSeconds * cyclesPerSecond
      const nextProgress = continuousPlay ? rawProgress % 1 : rawProgress

      if (!continuousPlay && nextProgress >= 1) {
        progressRef.current = 1
        setProgress(1)
        setIsPlaying(false)
        return
      }

      progressRef.current = nextProgress
      setProgress(nextProgress)

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [continuousPlay, cyclesPerSecond, isPlaying])

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new WebAudioEngine()
    }

    if (!model.sound.enabled || !isPlaying || !activePoint) {
      audioRef.current.stop()
      return
    }

    void audioRef.current.start(model, activePoint, points)

    return () => {
      if (!model.sound.enabled || !isPlaying) {
        audioRef.current?.stop()
      }
    }
  }, [activePoint, isPlaying, model, points])

  useEffect(
    () => () => {
      audioRef.current?.stop()
    },
    [],
  )

  const handleReset = () => {
    progressRef.current = 0
    setProgress(0)
    setIsPlaying(false)
  }

  const handlePlay = () => {
    if (progressRef.current >= 1) {
      progressRef.current = 0
      setProgress(0)
    }

    setIsPlaying(true)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) {
        return
      }

      event.preventDefault()

      if (isPlaying) {
        setIsPlaying(false)
      } else {
        handlePlay()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying])

  const handleSoundToggle = (enabled: boolean) => {
    setModel((currentModel) => ({
      ...currentModel,
      sound: { ...currentModel.sound, enabled },
    }))
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Browser instrument prototype</p>
          <h1>Spirophonic</h1>
        </div>
        <p className="summary">
          Shape, color, and sound emerge from one relationship model.
        </p>
      </header>

      <Transport
        isPlaying={isPlaying}
        soundEnabled={model.sound.enabled}
        continuousPlay={continuousPlay}
        progress={progress}
        onPlay={handlePlay}
        onPause={() => setIsPlaying(false)}
        onReset={handleReset}
        onSoundToggle={handleSoundToggle}
        onContinuousPlayToggle={setContinuousPlay}
      />
      <div className="preset-toolbar">
        <PresetPicker model={model} onSelect={setModel} />
        <ImportExportPanel model={model} points={points} onImport={setModel} />
      </div>

      <section className="workspace">
        <CanvasView
          model={model}
          points={points}
          progress={progress}
          showActivePoint={isPlaying}
        />
        <div className="side-panel">
          <ControlPanel model={model} onChange={setModel} />
          <StrudelExportPanel model={model} points={points} />
        </div>
      </section>
    </main>
  )
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)
  )
}

export default App
