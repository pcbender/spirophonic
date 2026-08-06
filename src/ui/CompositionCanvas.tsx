import { useEffect, useMemo, useRef, useState } from 'react'

import type { Composition } from '../core/composition'
import type { BoundaryCrossingEncounter } from '../core/encounters'
import {
  buildCompositionDrawCommands,
  buildCompositionScene,
  drawCompositionCommands,
  fitSpaceProjection,
  projectSpacePoint,
  sceneSpacePoints,
  type ObservationInterval,
  type TraceMode,
} from '../render/compositionRenderer'

export type CompositionCanvasProps = {
  composition: Composition
  timeSeconds: number
  observation: ObservationInterval
  traceMode?: TraceMode
  showTraces?: boolean
  showHeads?: boolean
  showDebugIds?: boolean
  ariaLabel?: string
  recentEncounters?: ReadonlyArray<BoundaryCrossingEncounter>
}

type CanvasSize = {
  width: number
  height: number
}

export function CompositionCanvas({
  composition,
  timeSeconds,
  observation,
  traceMode = 'configured',
  showTraces = true,
  showHeads = true,
  showDebugIds = false,
  ariaLabel = 'Spirophonic composition preview',
  recentEncounters = [],
}: CompositionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 1,
    height: 1,
  })
  const scene = useMemo(
    () =>
      buildCompositionScene(composition, timeSeconds, observation, {
        traceMode,
      }),
    [composition, observation, timeSeconds, traceMode],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      const width = Math.max(1, Math.floor(rect.width * pixelRatio))
      const height = Math.max(1, Math.floor(rect.height * pixelRatio))

      // Assigning width or height resets the bitmap even when the value is
      // unchanged. ResizeObserver fires an initial callback on observe(), so an
      // unguarded assignment can wipe an already-drawn scene; the size then
      // compares equal, no state change follows, and the draw effect never
      // re-runs. Only touch the backing store when it genuinely changes.
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      setCanvasSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      )
    }

    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    const projection = fitSpaceProjection(
      composition.space,
      [
        ...sceneSpacePoints(scene),
        ...recentEncounters.map((encounter) => encounter.position),
      ],
      {
        ...canvasSize,
        padding: Math.min(canvasSize.width, canvasSize.height) * 0.075,
      },
    )
    const commands = buildCompositionDrawCommands(scene, projection, {
      showTraces,
      showHeads,
      showDebugIds,
      headRadiusPixels:
        Math.max(1, Math.min(canvasSize.width, canvasSize.height) * 0.012),
    })

    drawCompositionCommands(context, commands)
    for (const encounter of recentEncounters) {
      const point = projectSpacePoint(encounter.position, projection)
      context.save()
      context.beginPath()
      context.arc(point.x, point.y, 5, 0, Math.PI * 2)
      context.fillStyle = '#f2c14e'
      context.fill()
      context.restore()
    }
  }, [
    canvasSize,
    composition.space,
    recentEncounters,
    scene,
    showDebugIds,
    showHeads,
    showTraces,
  ])

  return (
    <figure
      className="composition-canvas-shell"
      data-composition-id={composition.id}
      data-render-time={timeSeconds}
      data-trace-mode={traceMode}
      data-recent-encounters={recentEncounters.length}
    >
      <canvas ref={canvasRef} aria-label={ariaLabel} />
    </figure>
  )
}
