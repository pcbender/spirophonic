import { useEffect, useRef, useState } from 'react'
import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/trochoid'
import { drawSpiroTrace } from '../render/canvasRenderer'

type CanvasViewProps = {
  model: SpirophonicModel
  points: Array<SpiroPoint>
  progress?: number
  showActivePoint?: boolean
}

export function CanvasView({
  model,
  points,
  progress = 1,
  showActivePoint = false,
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [redrawKey, setRedrawKey] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const scale = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * scale))
      canvas.height = Math.max(1, Math.floor(rect.height * scale))
      setRedrawKey((currentKey) => currentKey + 1)
    }

    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!context) {
      return
    }

    const activeIndex = Math.floor(progress * Math.max(0, points.length - 1))
    drawSpiroTrace(context, points, model, {
      activeIndex,
      revealProgress: progress,
      showActivePoint,
    })
  }, [model, points, progress, redrawKey, showActivePoint])

  return (
    <div className="canvas-shell">
      <canvas ref={canvasRef} aria-label="Spirophonic trace preview" />
    </div>
  )
}
