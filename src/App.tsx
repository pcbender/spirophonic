import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import './App.css'
import { InstrumentRouter } from './audio/instrumentRouter'
import {
  PerformanceScheduler,
  type PlaybackStatus,
} from './audio/performanceScheduler'
import {
  ensureBundledSoundBank,
  type BundledBankState,
} from './audio/bundledSoundBank'
import { SoundBankStore } from './audio/soundbankStore'
import type { Composition } from './core/composition'
import {
  blankComposition,
  defaultComposition,
  referenceComposition,
} from './core/defaultComposition'
import { compilePerformance } from './core/performance'
import { beatsToSeconds, type PerformanceRequest } from './core/transport'
import {
  exportCompositionToJson,
  parseCompositionJson,
} from './export/compositionJson'
import { usePerformanceCompiler } from './workers/usePerformanceCompiler'
import { CompositionCanvas } from './ui/CompositionCanvas'
import {
  CompositionTree,
  type TreeSelection,
} from './ui/CompositionTree'
import { ControlPanel } from './ui/ControlPanel'
import { FieldPanel } from './ui/FieldPanel'
import { HeadPanel } from './ui/HeadPanel'
import { help } from './ui/help'
import { ImportExportPanel } from './ui/ImportExportPanel'
import { InstrumentPanel } from './ui/InstrumentPanel'
import { PartPanel } from './ui/PartPanel'
import { RailPanel } from './ui/RailPanel'
import { SoundBankPanel } from './ui/SoundBankPanel'
import { RecorderPanel } from './ui/RecorderPanel'
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

/**
 * What the app opens with, and whether that was the user's own work.
 *
 * The restore is silent otherwise: a returning user cannot tell their last
 * session from a default, and a reload looks like a reset that did not happen.
 * The caller shows a notice when `restored` is true, so the state of the
 * workspace is something the app says rather than something you infer.
 */
const openingComposition = (): {
  composition: Composition
  restored: boolean
} => {
  try {
    const saved = globalThis.localStorage?.getItem(WORKSPACE_STORAGE_KEY)
    if (!saved) return { composition: freshDefaultComposition(), restored: false }
    const parsed = parseCompositionJson(saved)
    return parsed.ok
      ? { composition: parsed.composition, restored: true }
      : { composition: freshDefaultComposition(), restored: false }
  } catch {
    return { composition: freshDefaultComposition(), restored: false }
  }
}

type AudioRuntime = {
  store: SoundBankStore
  router: InstrumentRouter
  scheduler: PerformanceScheduler
}

function App() {
  const [opening] = useState(openingComposition)
  const [composition, setComposition] = useState<Composition>(
    opening.composition,
  )
  // A replacement discards work that was never exported, so it is asked for
  // twice. `null` means nothing is pending.
  const [pendingReplacement, setPendingReplacement] = useState<
    'blank' | 'example' | null
  >(null)
  const [restoreNoticeSeen, setRestoreNoticeSeen] = useState(false)
  const [status, setStatus] = useState<PlaybackStatus>('stopped')
  const [looping, setLooping] = useState(true)
  const initialRequest = performanceRequestFor(composition)
  const [positionSeconds, setPositionSeconds] = useState(
    initialRequest.startSeconds,
  )
  const [pendingBoundarySeconds, setPendingBoundarySeconds] = useState<
    number | null
  >(null)
  // An error describes one attempt against one Composition, so it is stored
  // with the Composition it belongs to. Visibility is then derived during
  // render: a corrected Composition clears the message without an effect, and
  // a message never outlives its cause and tells the user their fix failed.
  const [runtimeError, setRuntimeError] = useState<Readonly<{
    message: string
    forComposition: Composition
  }> | null>(null)
  const [bundledBankState, setBundledBankState] = useState<BundledBankState>({
    state: 'idle',
  })
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
  // Compilation runs in a worker so an edit does not block the frame. The last
  // good performance stays on screen until the new one arrives.
  const {
    performance,
    // The Composition the performance was actually compiled from. Editing uses
    // `composition`; anything that consumes the performance uses this one, so
    // an in-flight compile can never pair new Instruments with old events.
    composition: compiledComposition,
    pending: compiling,
  } = usePerformanceCompiler(composition, request)
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
  const visibleRuntimeError =
    runtimeError && runtimeError.forComposition === composition
      ? runtimeError.message
      : ''
  const reportRuntimeError = useCallback(
    (message: string, forComposition: Composition) =>
      setRuntimeError(message ? { message, forComposition } : null),
    [],
  )

  /**
   * Puts the bundled General MIDI bank in the vault, once per browser.
   *
   * Deliberately not awaited and deliberately not during first paint: it is a
   * 38 MB download, and the app is fully usable without it because every
   * default Instrument is native. Once it lands, its presets are assignable
   * with no import step. A failure is not surfaced as an error — nothing the
   * user asked for has failed — but it is reported to the Sound banks panel.
   */
  useEffect(() => {
    const controller = new AbortController()
    const idle =
      globalThis.requestIdleCallback ??
      ((callback: () => void) => globalThis.setTimeout(callback, 1_000))
    const handle = idle(() => {
      void ensureBundledSoundBank({
        store: audio.store,
        signal: controller.signal,
        baseUrl: import.meta.env.BASE_URL,
        onState: setBundledBankState,
      })
    })
    return () => {
      controller.abort()
      globalThis.cancelIdleCallback?.(handle as number)
    }
  }, [audio.store])

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
      reportRuntimeError('Resolve compile errors before playing.', composition)
      return
    }

    try {
      const startAt =
        positionSeconds >= requestEnd - 1e-6
          ? request.startSeconds
          : renderTime
      const preparation = await audio.router.prepare(
        compiledComposition.soundBanks,
        compiledComposition.instruments,
      )
      const active = audio.scheduler
      await active.start(performance, compiledComposition.instruments, {
        tempoBpm: compiledComposition.transport.tempoBpm,
        loop: looping,
        positionSeconds: startAt,
      })
      scheduledPerformanceRef.current = performance
      scheduledTempoRef.current = compiledComposition.transport.tempoBpm
      setPositionSeconds(startAt)
      setPendingBoundarySeconds(null)
      reportRuntimeError(
        preparation.issues.map((issue) => issue.message).join(' '),
        composition,
      )
      setStatus(active.status)
    } catch (error) {
      reportRuntimeError(
        error instanceof Error ? error.message : String(error),
        composition,
      )
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

  /**
   * Replaces the whole workspace, after the second click.
   *
   * Playback stops too — a clean slate that keeps sounding the Composition it
   * replaced is telling the user their reset did not work — but the swap does
   * not wait on the audio device to release. Setting `status` to stopped in the
   * same batch is what closes the race: the effect that reconciles an edit
   * against a running scheduler returns early unless the status is 'playing',
   * so the new Composition can never be queued against the old performance.
   */
  const applyReplacement = (kind: 'blank' | 'example') => {
    void audio.scheduler.stop()
    setStatus('stopped')
    setPendingBoundarySeconds(null)
    setRuntimeError(null)
    setPendingReplacement(null)
    setRestoreNoticeSeen(true)
    const next = structuredClone(
      kind === 'blank' ? blankComposition : referenceComposition,
    ) as Composition
    setComposition(next)
    setPositionSeconds(performanceRequestFor(next).startSeconds)
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
          compiledComposition.soundBanks,
          compiledComposition.instruments,
        )
        if (cancelled) return
        const sameWindow =
          scheduled.request.startSeconds === performance.request.startSeconds &&
          scheduled.request.durationSeconds ===
            performance.request.durationSeconds
        const sameTempo =
          scheduledTempoRef.current === compiledComposition.transport.tempoBpm
        if (sameWindow && sameTempo) {
          active.queuePerformance(performance, compiledComposition.instruments)
          setPendingBoundarySeconds(active.pendingBoundarySeconds)
        } else {
          await active.stop()
          if (cancelled) return
          await active.start(performance, compiledComposition.instruments, {
            tempoBpm: compiledComposition.transport.tempoBpm,
            loop: looping,
            positionSeconds: request.startSeconds,
          })
          if (cancelled) return
          setPositionSeconds(request.startSeconds)
          setPendingBoundarySeconds(null)
        }
        scheduledPerformanceRef.current = performance
        scheduledTempoRef.current = composition.transport.tempoBpm
        reportRuntimeError(
          preparation.issues.map((issue) => issue.message).join(' '),
          composition,
        )
      } catch (error) {
        if (!cancelled) {
          reportRuntimeError(
            error instanceof Error ? error.message : String(error),
            composition,
          )
        }
      }
    }
    void applyEdit()
    return () => {
      cancelled = true
    }
  }, [
    audio,
    // The whole Composition is a dependency because a reported error is scoped
    // to it. This does not widen when the effect runs: `performance` is derived
    // from `composition`, so any change already re-triggers through it.
    composition,
    compiledComposition,
    looping,
    performance,
    reportRuntimeError,
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
        <div className="topbar-workspace">
          {pendingReplacement ? (
            <>
              <span className="replace-warning" role="alert">
                Discard “{composition.name}”? Anything not exported is lost.
              </span>
              <button
                type="button"
                onClick={() => applyReplacement(pendingReplacement)}
              >
                {pendingReplacement === 'blank'
                  ? 'Discard and start new'
                  : 'Discard and load example'}
              </button>
              <button type="button" onClick={() => setPendingReplacement(null)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                title={help['files.new']}
                onClick={() => setPendingReplacement('blank')}
              >
                New
              </button>
              <button
                type="button"
                title={help['files.loadExample']}
                onClick={() => setPendingReplacement('example')}
              >
                Load example
              </button>
              {opening.restored && !restoreNoticeSeen && (
                <span className="restore-notice">
                  Restored your last session from this browser.
                  <button
                    type="button"
                    aria-label="Dismiss restore notice"
                    onClick={() => setRestoreNoticeSeen(true)}
                  >
                    Dismiss
                  </button>
                </span>
              )}
            </>
          )}
        </div>
        <div className="topbar-io">
          <ImportExportPanel
            composition={compiledComposition}
            performance={performance}
            onImport={setComposition}
            vault={audio.store}
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

        {/*
          The transport sits under the trace it drives, not in the topbar. It is
          read against the shape while playing, and a control you watch while
          watching something else belongs beside that thing.
        */}
        <div className="canvas-stage">
          <div className="canvas-frame">
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
          <Transport
            status={status}
            looping={looping}
            positionSeconds={renderTime}
            startSeconds={request.startSeconds}
            durationSeconds={request.durationSeconds}
            eventCount={performance.performedEvents.length}
            compiling={compiling}
            pendingBoundarySeconds={pendingBoundarySeconds}
            onPlay={() => void play()}
            onPause={() => void pause()}
            onStop={() => void stop()}
            onSeek={seek}
            onLoopChange={setLoop}
          />
        </div>

        <div className="rail rail-voices">
          <Diagnostics
            diagnostics={performance.diagnostics}
            runtimeError={visibleRuntimeError}
            composition={composition}
          />
          <FieldPanel composition={composition} onChange={setComposition} />
          <PartPanel composition={composition} onChange={setComposition} />
          <SoundBankPanel
            composition={composition}
            bundledBankState={bundledBankState}
            onChange={setComposition}
            vault={audio.store}
            inspectBank={inspectSoundBank}
            audition={auditionSoundBank}
            invalidateBank={invalidateSoundBank}
          />
          <InstrumentPanel composition={composition} onChange={setComposition} />
          <VariationPanel composition={composition} onChange={setComposition} />
          <RecorderPanel
            composition={compiledComposition}
            performance={performance}
            positionSeconds={renderTime}
          />
        </div>
      </section>
    </main>
  )
}

type DiagnosticsProps = {
  diagnostics: ReturnType<typeof compilePerformance>['diagnostics']
  runtimeError: string
  composition: Composition
}

/**
 * Why a Composition is silent, when it is silent for a structural reason.
 *
 * A Composition with no Fields or no Parts compiles perfectly and produces
 * nothing, so "no compile diagnostics" is true and unhelpful — it is the state
 * a new Composition starts in. These say which link in the chain is missing,
 * in the vocabulary of the model: a Head needs a Boundary to cross before
 * there is an Encounter, and an Encounter needs a Part before there is a note.
 */
const silenceReason = (composition: Composition): string | null => {
  if (composition.fields.length === 0) {
    return 'No Fields, so nothing is crossed and no Encounters happen. Add a Field to give the Heads something to meet.'
  }
  if (composition.parts.length === 0) {
    return 'No Parts, so Encounters happen but nothing interprets them as notes. Add a Part to turn them into music.'
  }
  return null
}

function Diagnostics({
  diagnostics,
  runtimeError,
  composition,
}: DiagnosticsProps) {
  if (diagnostics.length === 0 && !runtimeError) {
    const silence = silenceReason(composition)
    return (
      <RailPanel label="Compile diagnostics" title="Performance">
        {silence ? <p>{silence}</p> : <p>No compile diagnostics.</p>}
      </RailPanel>
    )
  }

  return (
    <RailPanel label="Compile diagnostics" title="Performance diagnostics">
      {runtimeError && <p role="alert">{runtimeError}</p>}
      <ul>
        {diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${diagnostic.path ?? ''}-${index}`}>
            <strong>{diagnostic.severity}</strong>: {diagnostic.message}
          </li>
        ))}
      </ul>
    </RailPanel>
  )
}

export default App
