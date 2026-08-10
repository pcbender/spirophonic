import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { beatsToSeconds } from '../core/transport'
import { gatedModulationComposition } from '../test/fixtures/gateModulation'
import {
  buildPerformancePatternParts,
  exportPerformanceStrudel,
  exportPerformanceStrudelWithDiagnostics,
} from './strudelExport'

const fixture = () => {
  const composition = structuredClone(defaultComposition) as Composition
  const performance = compilePerformance(composition, {
    startSeconds: 0,
    durationSeconds: beatsToSeconds(
      composition.transport.loop.lengthBeats,
      composition.transport.tempoBpm,
    ),
    sampleRateHz: 120,
  })
  return { composition, performance }
}

describe('canonical performance Strudel export', () => {
  it('is deterministic and uses playable native Instrument vocabulary', () => {
    const { composition, performance } = fixture()
    const first = exportPerformanceStrudel(performance, composition)

    expect(first).toBe(exportPerformanceStrudel(performance, composition))
    expect(first).toContain('setcps(0.5)')
    expect(first).toContain('.s("triangle")')
    expect(first).not.toContain('.freq(')
  })

  it('contains one non-rest token per performed event', () => {
    const { composition, performance } = fixture()
    const tokens = buildPerformancePatternParts(performance, composition)
      .flatMap((part) => part.tokens)
      .filter((token) => token !== '~')

    expect(tokens).toHaveLength(performance.performedEvents.length)
  })

  it('adds a bounded control pattern without increasing the note count', () => {
    const composition = gatedModulationComposition()
    const performance = compilePerformance(composition, {
      startSeconds: 0,
      durationSeconds: beatsToSeconds(
        composition.transport.loop.lengthBeats,
        composition.transport.tempoBpm,
      ),
      sampleRateHz: 120,
    })
    const result = exportPerformanceStrudelWithDiagnostics(
      performance,
      composition,
    )
    const parts = buildPerformancePatternParts(performance, composition)

    expect(result.code).toContain('.lpf("')
    expect(parts[0].tokens.filter((token) => token !== '~')).toHaveLength(
      performance.performedEvents.length,
    )
    expect(parts[0].controls).toEqual([
      expect.objectContaining({ method: 'lpf' }),
    ])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'modulation-resolution',
        laneId: performance.modulationLanes[0].id,
      }),
    ])
  })
})
