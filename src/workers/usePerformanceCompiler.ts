import { useEffect, useRef, useState } from 'react'

import type { Composition } from '../core/composition'
import { compilePerformance, type CanonicalPerformance } from '../core/performance'
import type { PerformanceRequest } from '../core/transport'
import type {
  CompileReplyMessage,
  CompileRequestMessage,
} from './performanceWorker'

/**
 * Keeps compilation off the render thread.
 *
 * Compiling the reference Composition takes about 164 ms at the app's settings,
 * which is a dropped frame on every edit and roughly 6 fps while dragging a
 * control. `useDeferredValue` does not help: React can deprioritize the work
 * but cannot interrupt one long synchronous call. Moving it to a worker is the
 * only thing that actually unblocks the thread, and it is cheap — the whole
 * compiled performance structured-clones in under 2 ms.
 *
 * The last good performance stays on screen while a new one compiles, so an
 * edit never blanks the canvas or the diagnostics. `pending` says a newer
 * result is on its way.
 */

export type CompilerState = Readonly<{
  performance: CanonicalPerformance
  /**
   * The Composition `performance` was compiled from.
   *
   * With compilation asynchronous this is not always the Composition being
   * edited, and the difference matters: anything paired with the performance —
   * scheduling, exporting, drawing Encounters — must read Instruments and
   * Transport from *this* document, or it will look up ids that the compiled
   * events do not have yet. Editing reads the live Composition; consuming the
   * performance reads this one.
   */
  composition: Composition
  pending: boolean
  /** True when compilation is running inline because no worker is available. */
  synchronous: boolean
}>

/** Whether this environment can run a module worker at all. */
const workerSupported = () => typeof Worker !== 'undefined'

export const usePerformanceCompiler = (
  composition: Composition,
  request: PerformanceRequest,
): CompilerState => {
  // The first compile is synchronous because the first paint needs it, and
  // because the default Composition costs about 5 ms.
  const [compiled, setCompiled] = useState(() => ({
    composition,
    performance: compilePerformance(composition, request),
  }))
  const [pending, setPending] = useState(false)
  // Derived from a pure check at mount rather than reported from an effect.
  const [synchronous, setSynchronous] = useState(() => !workerSupported())

  const workerRef = useRef<Worker | null>(null)
  const sequenceRef = useRef(0)
  const inputRef = useRef({ composition, request })
  const firstRef = useRef(true)

  useEffect(() => {
    if (!workerSupported()) return

    let worker: Worker
    try {
      worker = new Worker(new URL('./performanceWorker.ts', import.meta.url), {
        type: 'module',
      })
    } catch {
      // A blocked worker is not worth surfacing as an error: the inline path
      // produces the same result, only on the render thread. Reported on a
      // later tick, because a setState in an effect body cascades a render.
      const handle = setTimeout(() => setSynchronous(true), 0)
      return () => clearTimeout(handle)
    }

    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<CompileReplyMessage>) => {
      const reply = event.data
      // Only the newest request may land. An older compile finishing late must
      // not replace a newer result.
      if (reply.sequence !== sequenceRef.current) return
      if (reply.ok) {
        setCompiled({
          composition: inputRef.current.composition,
          performance: reply.performance,
        })
      }
      setPending(false)
    }
    worker.onerror = () => {
      // Fall back for good: a worker that failed once will fail again, and a
      // stale performance on screen is worse than a blocked frame.
      worker.terminate()
      workerRef.current = null
      setSynchronous(true)
      const { composition: held, request: heldRequest } = inputRef.current
      setCompiled({
        composition: held,
        performance: compilePerformance(held, heldRequest),
      })
      setPending(false)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    // Held so a worker failure can recompile whatever is current, rather than
    // leaving a stale performance on screen until the next edit.
    inputRef.current = { composition, request }

    // The state initializer already compiled this exact input.
    if (firstRef.current) {
      firstRef.current = false
      return
    }

    const worker = workerRef.current
    if (!worker) {
      setCompiled({
        composition,
        performance: compilePerformance(composition, request),
      })
      setPending(false)
      return
    }

    sequenceRef.current += 1
    setPending(true)
    const message: CompileRequestMessage = {
      sequence: sequenceRef.current,
      composition,
      request,
    }
    worker.postMessage(message)
  }, [composition, request])

  return {
    performance: compiled.performance,
    composition: compiled.composition,
    pending,
    synchronous,
  }
}
