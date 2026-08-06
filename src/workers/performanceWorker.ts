import type { Composition } from '../core/composition'
import { compilePerformance, type CanonicalPerformance } from '../core/performance'
import type { PerformanceRequest } from '../core/transport'

/**
 * Compiles a Composition off the render thread.
 *
 * The compiler is pure and has no DOM, audio, or storage dependency, which is
 * exactly what makes this possible: the worker imports `src/core` and nothing
 * else. The dependency points from the worker into core, never the other way,
 * so architectural invariant 7 still holds.
 *
 * Every request carries a sequence number and every reply echoes it. The main
 * thread applies only the reply matching its newest request, so a slow compile
 * for an old edit can never overwrite a newer result.
 */

export type CompileRequestMessage = Readonly<{
  sequence: number
  composition: Composition
  request: PerformanceRequest
}>

export type CompileReplyMessage =
  | Readonly<{
      sequence: number
      ok: true
      performance: CanonicalPerformance
    }>
  | Readonly<{ sequence: number; ok: false; message: string }>

self.onmessage = (event: MessageEvent<CompileRequestMessage>) => {
  const { sequence, composition, request } = event.data
  try {
    const performance = compilePerformance(composition, request)
    const reply: CompileReplyMessage = { sequence, ok: true, performance }
    self.postMessage(reply)
  } catch (error) {
    const reply: CompileReplyMessage = {
      sequence,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(reply)
  }
}
