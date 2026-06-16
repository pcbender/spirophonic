import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { WebAudioEngine } from './audio/webAudioEngine'
import { defaultModel } from './core/defaultModel'
import type { SpirophonicModel } from './core/model'
import { generateSpiroPoints } from './core/spirograph'
import { CanvasView } from './ui/CanvasView'
import { ControlPanel } from './ui/ControlPanel'
import { ImportExportPanel } from './ui/ImportExportPanel'
import { PresetPicker } from './ui/PresetPicker'
import { StrudelExportPanel } from './ui/StrudelExportPanel'
import { Transport } from './ui/Transport'

function App() {
  const [model, setModel] = useState<SpirophonicModel>(defaultModel)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(1)
  const previousFrameRef = useRef<number | null>(null)
  const audioRef = useRef<WebAudioEngine | null>(null)
  const points = useMemo(() => generateSpiroPoints(model), [model])
  const activeIndex = Math.floor(progress * Math.max(0, points.length - 1))
  const activePoint = points[activeIndex] ?? points[0]

  useEffect(() => {
    if (!isPlaying) {
      previousFrameRef.current = null
      return
    }

    let frameId = 0

    const animate = (timestamp: number) => {
      const previous = previousFrameRef.current ?? timestamp
      const deltaSeconds = (timestamp - previous) / 1000
      previousFrameRef.current = timestamp

      setProgress((currentProgress) => {
        const nextProgress =
          currentProgress + deltaSeconds * model.time.cyclesPerSecond

        return nextProgress % 1
      })

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, model.time.cyclesPerSecond])

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
    setProgress(0)
    setIsPlaying(false)
  }

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
        progress={progress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onReset={handleReset}
        onSoundToggle={handleSoundToggle}
      />
      <PresetPicker model={model} onSelect={setModel} />
      <ImportExportPanel model={model} points={points} onImport={setModel} />

      <section className="workspace">
        <CanvasView model={model} points={points} progress={progress} />
        <div className="side-panel">
          <ControlPanel model={model} onChange={setModel} />
          <StrudelExportPanel model={model} points={points} />
        </div>
      </section>
    </main>
  )
}

export default App
