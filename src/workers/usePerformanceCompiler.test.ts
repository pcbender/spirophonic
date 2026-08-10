import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import { compilePerformance } from '../core/performance'
import {
  concurrentWheelsComposition,
  ringAndSpokeComposition,
} from '../test/fixtures/compositions'
import { gatedModulationComposition } from '../test/fixtures/gateModulation'
import { usePerformanceCompiler } from './usePerformanceCompiler'
import type { CompileReplyMessage, CompileRequestMessage } from './performanceWorker'

const request = { startSeconds: 0, durationSeconds: 2, sampleRateHz: 120 }

/**
 * jsdom has no Worker, so the worker path is exercised against a stub that
 * records what was posted and lets each test decide when — and in what order —
 * a reply arrives. That is the whole point: the ordering rules are what this
 * hook exists to get right, and a real worker would make them unobservable.
 */
class StubWorker {
  static instances: Array<StubWorker> = []
  readonly posted: Array<CompileRequestMessage> = []
  onmessage: ((event: MessageEvent<CompileReplyMessage>) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  terminated = false

  constructor() {
    StubWorker.instances.push(this)
  }

  postMessage(message: CompileRequestMessage) {
    this.posted.push(message)
  }

  terminate() {
    this.terminated = true
  }

  reply(message: CompileReplyMessage) {
    this.onmessage?.({ data: message } as MessageEvent<CompileReplyMessage>)
  }
}

const useStubWorker = () => {
  StubWorker.instances = []
  vi.stubGlobal('Worker', StubWorker)
  return StubWorker
}

afterEach(() => {
  vi.unstubAllGlobals()
  StubWorker.instances = []
})

describe('without a worker', () => {
  it('compiles inline and still returns a performance', () => {
    // jsdom provides no Worker, so this is the fallback path by default.
    const composition = ringAndSpokeComposition()
    const { result } = renderHook(() =>
      usePerformanceCompiler(composition, request),
    )

    expect(result.current.performance.performedEvents.length).toBeGreaterThan(0)
    expect(result.current.pending).toBe(false)
  })

  it('recompiles inline when the Composition changes', async () => {
    const first = ringAndSpokeComposition()
    const second = concurrentWheelsComposition()
    const { result, rerender } = renderHook(
      ({ composition }: { composition: Composition }) =>
        usePerformanceCompiler(composition, request),
      { initialProps: { composition: first } },
    )

    const before = result.current.performance.performedEvents.length
    rerender({ composition: second })

    await waitFor(() => {
      expect(result.current.performance.performedEvents.length).not.toBe(before)
    })
    expect(result.current.pending).toBe(false)
    expect(result.current.performance.performedEvents.length).toBe(
      compilePerformance(second, request).performedEvents.length,
    )
  })
})

describe('with a worker', () => {
  it('compiles the first performance inline so the first paint has one', () => {
    useStubWorker()
    const composition = ringAndSpokeComposition()
    const { result } = renderHook(() =>
      usePerformanceCompiler(composition, request),
    )

    // Nothing was posted for the initial input; it was already compiled.
    expect(result.current.performance.performedEvents.length).toBeGreaterThan(0)
    expect(StubWorker.instances[0]?.posted).toEqual([])
  })

  it('posts an edit to the worker and keeps the old performance meanwhile', async () => {
    useStubWorker()
    const first = ringAndSpokeComposition()
    const second = concurrentWheelsComposition()
    const { result, rerender } = renderHook(
      ({ composition }: { composition: Composition }) =>
        usePerformanceCompiler(composition, request),
      { initialProps: { composition: first } },
    )

    const before = result.current.performance
    rerender({ composition: second })

    await waitFor(() => expect(result.current.pending).toBe(true))
    // The screen still shows the last good performance rather than blanking.
    expect(result.current.performance).toBe(before)

    const worker = StubWorker.instances[0]
    expect(worker.posted).toHaveLength(1)
    expect(worker.posted[0].composition.id).toBe(second.id)

    const compiled = compilePerformance(second, request)
    act(() => {
      worker.reply({
        sequence: worker.posted[0].sequence,
        ok: true,
        performance: compiled,
      })
    })

    await waitFor(() => expect(result.current.pending).toBe(false))
    expect(result.current.performance).toBe(compiled)
  })

  it('preserves deterministic modulation lanes through a worker clone', async () => {
    useStubWorker()
    const first = ringAndSpokeComposition()
    const gated = gatedModulationComposition()
    const { result, rerender } = renderHook(
      ({ composition }: { composition: Composition }) =>
        usePerformanceCompiler(composition, request),
      { initialProps: { composition: first } },
    )

    rerender({ composition: gated })
    await waitFor(() => expect(result.current.pending).toBe(true))
    const worker = StubWorker.instances[0]
    const compiled = compilePerformance(gated, request)
    expect(compiled.modulationLanes.length).toBeGreaterThan(0)
    const cloned = structuredClone(compiled)
    act(() => {
      worker.reply({
        sequence: worker.posted[0].sequence,
        ok: true,
        performance: cloned,
      })
    })

    await waitFor(() => expect(result.current.pending).toBe(false))
    expect(result.current.performance.modulationLanes).toEqual(
      compiled.modulationLanes,
    )
    expect(result.current.performance.modulationLanes).not.toBe(
      compiled.modulationLanes,
    )
  })

  it('ignores a stale reply that lands after a newer one', async () => {
    useStubWorker()
    const first = ringAndSpokeComposition()
    const second = concurrentWheelsComposition()
    const third = ringAndSpokeComposition()
    third.id = 'third-edit'

    const { result, rerender } = renderHook(
      ({ composition }: { composition: Composition }) =>
        usePerformanceCompiler(composition, request),
      { initialProps: { composition: first } },
    )

    rerender({ composition: second })
    await waitFor(() => expect(result.current.pending).toBe(true))
    rerender({ composition: third })
    await waitFor(() =>
      expect(StubWorker.instances[0].posted).toHaveLength(2),
    )

    const worker = StubWorker.instances[0]
    const newest = compilePerformance(third, request)
    const stale = compilePerformance(second, request)

    // Newest lands first, then the slow older one arrives.
    act(() => {
      worker.reply({
        sequence: worker.posted[1].sequence,
        ok: true,
        performance: newest,
      })
    })
    await waitFor(() => expect(result.current.pending).toBe(false))
    expect(result.current.performance).toBe(newest)

    act(() => {
      worker.reply({
        sequence: worker.posted[0].sequence,
        ok: true,
        performance: stale,
      })
    })

    // The older edit must not overwrite the newer one.
    expect(result.current.performance).toBe(newest)
  })

  it('falls back to inline compilation when the worker errors', async () => {
    useStubWorker()
    const first = ringAndSpokeComposition()
    const second = concurrentWheelsComposition()
    const { result, rerender } = renderHook(
      ({ composition }: { composition: Composition }) =>
        usePerformanceCompiler(composition, request),
      { initialProps: { composition: first } },
    )

    const worker = StubWorker.instances[0]
    act(() => worker.onerror?.(new Error('worker died')))

    await waitFor(() => expect(result.current.synchronous).toBe(true))
    expect(worker.terminated).toBe(true)

    // Edits still work, on the render thread.
    rerender({ composition: second })
    await waitFor(() => {
      expect(result.current.performance.performedEvents.length).toBe(
        compilePerformance(second, request).performedEvents.length,
      )
    })
    expect(result.current.pending).toBe(false)
  })

  /*
   * A compile that throws returns no performance, so it carries no diagnostics
   * either. This reply used to be dropped without a trace: the last good
   * performance stayed on screen under a diagnostics panel reporting nothing
   * wrong, which is the one state where the app actively misinforms.
   */
  it('reports a compile that failed instead of dropping the reply', async () => {
    useStubWorker()
    const first = ringAndSpokeComposition()
    const second = concurrentWheelsComposition()
    const { result, rerender } = renderHook(
      ({ composition }: { composition: Composition }) =>
        usePerformanceCompiler(composition, request),
      { initialProps: { composition: first } },
    )

    const before = result.current.performance
    rerender({ composition: second })
    const worker = StubWorker.instances[0]
    act(() =>
      worker.reply({
        sequence: worker.posted.at(-1)!.sequence,
        ok: false,
        message: 'Tuned ratio produced Infinity Hz.',
      }),
    )

    await waitFor(() =>
      expect(result.current.failure).toBe('Tuned ratio produced Infinity Hz.'),
    )
    // The last good performance is still what plays and draws — it is simply
    // no longer claimed to be the Composition on screen.
    expect(result.current.performance).toBe(before)
    expect(result.current.pending).toBe(false)

    // A later compile that succeeds clears it, rather than latching.
    rerender({ composition: first })
    act(() =>
      worker.reply({
        sequence: worker.posted.at(-1)!.sequence,
        ok: true,
        performance: compilePerformance(first, request),
      }),
    )
    await waitFor(() => expect(result.current.failure).toBe(''))
  })

  it('terminates its worker on unmount', () => {
    useStubWorker()
    const { unmount } = renderHook(() =>
      usePerformanceCompiler(ringAndSpokeComposition(), request),
    )

    const worker = StubWorker.instances[0]
    expect(worker.terminated).toBe(false)
    unmount()
    expect(worker.terminated).toBe(true)
  })
})
