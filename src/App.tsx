import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import './App.css'
import { InstrumentRouter } from './audio/instrumentRouter'
import {
  PerformanceScheduler,
  type PlaybackStatus,
} from './audio/performanceScheduler'
import { SoundBankStore } from './audio/soundbankStore'
import type { Composition } from './core/composition'
import { defaultComposition } from './core/defaultComposition'
import { compilePerformance } from './core/performance'
import { beatsToSeconds, type PerformanceRequest } from './core/transport'
import {
  exportCompositionToJson,
  parseCompositionJson,
} from './export/compositionJson'
import { CompositionCanvas } from './ui/CompositionCanvas'
import {
  CompositionTree,
  type TreeSelection,
} from './ui/CompositionTree'
import { ControlPanel } from './ui/ControlPanel'
import { FieldPanel } from './ui/FieldPanel'
import { HeadPanel } from './ui/HeadPanel'
import { ImportExportPanel } from './ui/ImportExportPanel'
import { InstrumentPanel } from './ui/InstrumentPanel'
import { PartPanel } from './ui/PartPanel'
import { SoundBankPanel } from './ui/SoundBankPanel'
import { Transport } from './ui/Transport'
import { VariationPanel } from './ui/VariationPanel'
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

const WORKSPACE_STORAGE_KEY = 'spirophonic.composition.v1'

const freshDefaultComposition = () =>
  structuredClone(defaultComposition) as Composition

const restoredComposition = () => {
  try {
    const saved = globalThis.localStorage?.getItem(WORKSPACE_STORAGE_KEY)
    if (!saved) return freshDefaultComposition()
    const parsed = parseCompositionJson(saved)
    return parsed.ok ? parsed.composition : freshDefaultComposition()
  } catch {
    return freshDefaultComposition()
  }
}

type AudioRuntime = {
  store: SoundBankStore
  router: InstrumentRouter
  scheduler: PerformanceScheduler
}

function App() {
  const [composition, setComposition] = useState<Composition>(restoredComposition)
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
  const [selection, setSelection] = useState<TreeSelection>(() => ({
    kind: 'wheel',
    id: '',
  }))
  const [audio] = useState<AudioRuntime>(() => {
    const store = new SoundBankStore()
    const router = new InstrumentRouter({ store })
    return {
      store,
      router,
      scheduler: new PerformanceScheduler(router),
    }
  })
  const audioLifecycleRef = useRef<object | null>(null)
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
  /**
   * Selection is resolved against the live Composition every render, so an
   * import, an undo, or a cascading removal can never leave a panel pointing
   * at an object that no longer exists.
   */
  const resolvedSelection = useMemo((): TreeSelection => {
    const wheelExists = composition.wheels.some(
      (wheel) => wheel.id === selection.id,
    )
    const headExists = composition.wheels.some((wheel) =>
      wheel.heads.some((head) => head.id === selection.id),
    )
    const partExists = composition.parts.some((part) => part.id === selection.id)

    if (selection.kind === 'wheel' && wheelExists) return selection
    if (selection.kind === 'head' && headExists) return selection
    if (selection.kind === 'part' && partExists) return selection
    return { kind: 'wheel', id: composition.wheels[0]?.id ?? '' }
  }, [composition, selection])
  const selectedWheelId =
    resolvedSelection.kind === 'wheel'
      ? resolvedSelection.id
      : resolvedSelection.kind === 'head'
        ? composition.wheels.find((wheel) =>
            wheel.heads.some((head) => head.id === resolvedSelection.id),
          )?.id
        : undefined
  const selectedHeadId =
    resolvedSelection.kind === 'head' ? resolvedSelection.id : undefined
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

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(
        WORKSPACE_STORAGE_KEY,
        exportCompositionToJson(composition),
      )
    } catch {
      // Local persistence is a convenience; explicit JSON export stays primary.
    }
  }, [composition])

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
      const preparation = await audio.router.prepare(
        composition.soundBanks,
        composition.instruments,
      )
      const active = audio.scheduler
      await active.start(performance, composition.instruments, {
        tempoBpm: composition.transport.tempoBpm,
        loop: looping,
        positionSeconds: startAt,
      })
      scheduledPerformanceRef.current = performance
      scheduledTempoRef.current = composition.transport.tempoBpm
      setPositionSeconds(startAt)
      setPendingBoundarySeconds(null)
      setRuntimeError(
        preparation.issues.map((issue) => issue.message).join(' '),
      )
      setStatus(active.status)
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error))
    }
  }

  const pause = async () => {
    const active = audio.scheduler
    await active.pause()
    setPositionSeconds(active.positionSeconds)
    setStatus(active.status)
  }

  const stop = async () => {
    await audio.scheduler.stop()
    setStatus('stopped')
    setPositionSeconds(request.startSeconds)
    setPendingBoundarySeconds(null)
  }

  const seek = (nextPosition: number) => {
    audio.scheduler.seek(nextPosition)
    setPositionSeconds(nextPosition)
  }

  const setLoop = (nextLooping: boolean) => {
    setLooping(nextLooping)
    audio.scheduler.setLoop(nextLooping)
  }

  const inspectSoundBank = useCallback(
    (reference: Composition['soundBanks'][number]) =>
      audio.router.inspectBank(reference),
    [audio],
  )
  const auditionSoundBank = useCallback(
    (
      reference: Composition['soundBanks'][number],
      preset: Parameters<InstrumentRouter['audition']>[1],
      note: number,
    ) => audio.router.audition(reference, preset, note),
    [audio],
  )
  const invalidateSoundBank = useCallback(
    (soundBankId: string) =>
      audio.router.invalidateBank(soundBankId),
    [audio],
  )

  useEffect(() => {
    if (status !== 'playing') return
    const runtime = audio
    const active = runtime.scheduler
    const scheduled = scheduledPerformanceRef.current
    if (!scheduled || scheduled === performance) return

    let cancelled = false
    const applyEdit = async () => {
      try {
        const preparation = await runtime.router.prepare(
          composition.soundBanks,
          composition.instruments,
        )
        if (cancelled) return
        const sameWindow =
          scheduled.request.startSeconds === performance.request.startSeconds &&
          scheduled.request.durationSeconds ===
            performance.request.durationSeconds
        const sameTempo =
          scheduledTempoRef.current === composition.transport.tempoBpm
        if (sameWindow && sameTempo) {
          active.queuePerformance(performance, composition.instruments)
          setPendingBoundarySeconds(active.pendingBoundarySeconds)
        } else {
          await active.stop()
          if (cancelled) return
          await active.start(performance, composition.instruments, {
            tempoBpm: composition.transport.tempoBpm,
            loop: looping,
            positionSeconds: request.startSeconds,
          })
          if (cancelled) return
          setPositionSeconds(request.startSeconds)
          setPendingBoundarySeconds(null)
        }
        scheduledPerformanceRef.current = performance
        scheduledTempoRef.current = composition.transport.tempoBpm
        setRuntimeError(
          preparation.issues.map((issue) => issue.message).join(' '),
        )
      } catch (error) {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : String(error))
        }
      }
    }
    void applyEdit()
    return () => {
      cancelled = true
    }
  }, [
    audio,
    composition.instruments,
    composition.soundBanks,
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
      const active = audio.scheduler
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
  }, [audio, looping, requestEnd, status])

  useEffect(() => {
    const lifecycle = {}
    audioLifecycleRef.current = lifecycle
    return () => {
      queueMicrotask(() => {
        if (audioLifecycleRef.current !== lifecycle) return
        audioLifecycleRef.current = null
        void audio.scheduler.dispose().finally(() => audio.store.close())
      })
    }
  }, [audio])

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
          <CompositionTree
            composition={composition}
            selection={resolvedSelection}
            onSelect={setSelection}
            onChange={setComposition}
          />
          <WheelPanel
            composition={composition}
            selectedWheelId={selectedWheelId}
            onChange={setComposition}
          />
          <HeadPanel
            composition={composition}
            selectedHeadId={selectedHeadId}
            onChange={setComposition}
          />
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
          <SoundBankPanel
            composition={composition}
            onChange={setComposition}
            vault={audio.store}
            inspectBank={inspectSoundBank}
            audition={auditionSoundBank}
            invalidateBank={invalidateSoundBank}
          />
          <InstrumentPanel composition={composition} onChange={setComposition} />
          <VariationPanel composition={composition} onChange={setComposition} />
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
