import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { beatsToSeconds } from '../core/transport'
import {
  buildPerformancePatternParts,
  exportPerformanceStrudel,
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
})
