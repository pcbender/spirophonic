import { useEffect, useRef } from 'react'
import type { SpirophonicModel } from '../core/model'
import type { SpiroPoint } from '../core/spirograph'
import { drawSpiroTrace } from '../render/canvasRenderer'

type CanvasViewProps = {
  model: SpirophonicModel
  points: Array<SpiroPoint>
  progress?: number
}

export function CanvasView({ model, points, progress = 1 }: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resizeAndDraw = () => {
      const rect = canvas.getBoundingClientRect()
      const scale = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * scale))
      canvas.height = Math.max(1, Math.floor(rect.height * scale))

      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      const activeIndex = Math.floor(progress * Math.max(0, points.length - 1))
      drawSpiroTrace(context, points, model, {
        activeIndex,
        revealProgress: progress,
      })
    }

    resizeAndDraw()

    const observer = new ResizeObserver(resizeAndDraw)
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [model, points, progress])

  return (
    <div className="canvas-shell">
      <canvas ref={canvasRef} aria-label="Spirophonic trace preview" />
    </div>
  )
}

