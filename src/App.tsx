import { useEffect, useMemo, useRef, useState } from 'react'

import './App.css'
import { NativeSynthEngine } from './audio/nativeSynthEngine'
import {
  PerformanceScheduler,
  type PlaybackStatus,
} from './audio/performanceScheduler'
import type { Composition } from './core/composition'
import { defaultComposition } from './core/defaultComposition'
import { compilePerformance } from './core/performance'
import { beatsToSeconds, type PerformanceRequest } from './core/transport'
import { CompositionCanvas } from './ui/CompositionCanvas'
import { ControlPanel } from './ui/ControlPanel'
import { FieldPanel } from './ui/FieldPanel'
import { HeadPanel } from './ui/HeadPanel'
import { ImportExportPanel } from './ui/ImportExportPanel'
import { InstrumentPanel } from './ui/InstrumentPanel'
import { PartPanel } from './ui/PartPanel'
import { Transport } from './ui/Transport'
import { WheelPanel } from './ui/WheelPanel'

const performanceRequestFor = (
  composition: Composition,
): PerformanceRequest => ({
  startSeconds: beatsToSeconds(
    composition.transport.loop.startBeat,
    composition.transport.tempoBpm,
  ),
  durationSeconds: beatsToSeconds(
    composition.transport.loop.lengthBeats,
    composition.transport.tempoBpm,
  ),
  sampleRateHz: 120,
})

function App() {
  const [composition, setComposition] = useState<Composition>(() =>
    structuredClone(defaultComposition) as Composition,
  )
  const [status, setStatus] = useState<PlaybackStatus>('stopped')
  const [looping, setLooping] = useState(true)
  const initialRequest = performanceRequestFor(composition)
  const [positionSeconds, setPositionSeconds] = useState(
    initialRequest.startSeconds,
  )
  const [pendingBoundarySeconds, setPendingBoundarySeconds] = useState<
    number | null
  >(null)
  const [runtimeError, setRuntimeError] = useState('')
  const schedulerRef = useRef<PerformanceScheduler | null>(null)
  const scheduledPerformanceRef = useRef<ReturnType<
    typeof compilePerformance
  > | null>(null)
  const scheduledTempoRef = useRef(composition.transport.tempoBpm)
  const request = useMemo(
    () => performanceRequestFor(composition),
    [composition],
  )
  const performance = useMemo(
    () => compilePerformance(composition, request),
    [composition, request],
  )
  const requestEnd = request.startSeconds + request.durationSeconds
  const renderTime = Math.min(
    requestEnd,
    Math.max(request.startSeconds, positionSeconds),
  )
  const recentEncounters = performance.encounters.filter(
    (encounter) =>
      encounter.timeSeconds <= renderTime &&
      renderTime - encounter.timeSeconds <= 0.35,
  )

  const scheduler = () => {
    if (!schedulerRef.current) {
      schedulerRef.current = new PerformanceScheduler(new NativeSynthEngine())
    }
    return schedulerRef.current
  }

  const play = async () => {
    if (performance.diagnostics.some((item) => item.severity === 'error')) {
      setRuntimeError('Resolve compile errors before playing.')
      return
    }

    try {
      const startAt =
        positionSeconds >= requestEnd - 1e-6
          ? request.startSeconds
          : renderTime
      const active = scheduler()
      await active.start(performance, composition.instruments, {
        tempoBpm: composition.transport.tempoBpm,
        loop: looping,
        positionSeconds: startAt,
      })
      scheduledPerformanceRef.current = performance
      scheduledTempoRef.current = composition.transport.tempoBpm
      setPositionSeconds(startAt)
      setPendingBoundarySeconds(null)
      setRuntimeError('')
      setStatus(active.status)
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error))
    }
  }

  const pause = async () => {
    const active = schedulerRef.current
    if (!active) return
    await active.pause()
    setPositionSeconds(active.positionSeconds)
    setStatus(active.status)
  }

  const stop = async () => {
    const active = schedulerRef.current
    if (active) await active.stop()
    setStatus('stopped')
    setPositionSeconds(request.startSeconds)
    setPendingBoundarySeconds(null)
  }

  const seek = (nextPosition: number) => {
    schedulerRef.current?.seek(nextPosition)
    setPositionSeconds(nextPosition)
  }

  const setLoop = (nextLooping: boolean) => {
    setLooping(nextLooping)
    schedulerRef.current?.setLoop(nextLooping)
  }

  useEffect(() => {
    if (status !== 'playing') return
    const active = schedulerRef.current
    const scheduled = scheduledPerformanceRef.current
    if (!active || !scheduled || scheduled === performance) return

    const sameWindow =
      scheduled.request.startSeconds === performance.request.startSeconds &&
      scheduled.request.durationSeconds === performance.request.durationSeconds
    const sameTempo =
      scheduledTempoRef.current === composition.transport.tempoBpm

    if (sameWindow && sameTempo) {
      try {
        active.queuePerformance(performance, composition.instruments)
        scheduledPerformanceRef.current = performance
        setPendingBoundarySeconds(active.pendingBoundarySeconds)
        setRuntimeError('')
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error))
      }
      return
    }

    let cancelled = false
    const restart = async () => {
      try {
        await active.stop()
        if (cancelled) return
        await active.start(performance, composition.instruments, {
          tempoBpm: composition.transport.tempoBpm,
          loop: looping,
          positionSeconds: request.startSeconds,
        })
        if (cancelled) return
        scheduledPerformanceRef.current = performance
        scheduledTempoRef.current = composition.transport.tempoBpm
        setPositionSeconds(request.startSeconds)
        setPendingBoundarySeconds(null)
        setRuntimeError('')
      } catch (error) {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : String(error))
        }
      }
    }
    void restart()
    return () => {
      cancelled = true
    }
  }, [
    composition.instruments,
    composition.transport.tempoBpm,
    looping,
    performance,
    request.startSeconds,
    status,
  ])

  useEffect(() => {
    if (status !== 'playing') return
    let frameId = 0

    const updatePosition = () => {
      const active = schedulerRef.current
      if (!active) return
      const nextPosition = active.positionSeconds
      setPositionSeconds(nextPosition)
      setPendingBoundarySeconds(active.pendingBoundarySeconds)

      if (!looping && nextPosition >= requestEnd - 1e-6) {
        void active.stop().then(() => setStatus('stopped'))
        return
      }
      frameId = requestAnimationFrame(updatePosition)
    }

    frameId = requestAnimationFrame(updatePosition)
    return () => cancelAnimationFrame(frameId)
  }, [looping, requestEnd, status])

  useEffect(
    () => () => {
      const active = schedulerRef.current
      schedulerRef.current = null
      if (active) void active.dispose()
    },
    [],
  )

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="brand">
          <h1>Spirophonic</h1>
          <p className="tagline">Compose relationships. Hear encounters.</p>
        </div>
        <Transport
          status={status}
          looping={looping}
          positionSeconds={renderTime}
          startSeconds={request.startSeconds}
          durationSeconds={request.durationSeconds}
          eventCount={performance.performedEvents.length}
          pendingBoundarySeconds={pendingBoundarySeconds}
          onPlay={() => void play()}
          onPause={() => void pause()}
          onStop={() => void stop()}
          onSeek={seek}
          onLoopChange={setLoop}
        />
        <div className="topbar-io">
          <ImportExportPanel
            composition={composition}
            performance={performance}
            onImport={setComposition}
          />
        </div>
      </header>

      <section className="workspace">
        <div className="rail rail-shape">
          <ControlPanel composition={composition} onChange={setComposition} />
          <WheelPanel composition={composition} onChange={setComposition} />
          <HeadPanel composition={composition} onChange={setComposition} />
        </div>

        <div className="canvas-stage">
          <CompositionCanvas
            composition={composition}
            timeSeconds={renderTime}
            observation={{
              startSeconds: request.startSeconds,
              endSeconds: requestEnd,
              sampleRateHz: request.sampleRateHz,
            }}
            recentEncounters={recentEncounters}
          />
        </div>

        <div className="rail rail-voices">
          <Diagnostics
            diagnostics={performance.diagnostics}
            runtimeError={runtimeError}
          />
          <FieldPanel composition={composition} onChange={setComposition} />
          <PartPanel composition={composition} onChange={setComposition} />
          <InstrumentPanel composition={composition} onChange={setComposition} />
        </div>
      </section>
    </main>
  )
}

type DiagnosticsProps = {
  diagnostics: ReturnType<typeof compilePerformance>['diagnostics']
  runtimeError: string
}

function Diagnostics({ diagnostics, runtimeError }: DiagnosticsProps) {
  if (diagnostics.length === 0 && !runtimeError) {
    return (
      <section className="control-panel" aria-label="Compile diagnostics">
        <h2>Performance</h2>
        <p>No compile diagnostics.</p>
      </section>
    )
  }

  return (
    <section className="control-panel" aria-label="Compile diagnostics">
      <h2>Performance diagnostics</h2>
      {runtimeError && <p role="alert">{runtimeError}</p>}
      <ul>
        {diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${diagnostic.path ?? ''}-${index}`}>
            <strong>{diagnostic.severity}</strong>: {diagnostic.message}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default App
