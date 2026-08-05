import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { beatsToSeconds } from '../core/transport'
import { buildPerformanceMidiTracks } from './midiExport'
import { buildPerformancePatternParts } from './strudelExport'

describe('canonical export agreement', () => {
  it('MIDI and Strudel adapt every performed event exactly once', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const performance = compilePerformance(composition, {
      startSeconds: 0,
      durationSeconds: beatsToSeconds(
        composition.transport.loop.lengthBeats,
        composition.transport.tempoBpm,
      ),
      sampleRateHz: 120,
    })
    const midiCount = buildPerformanceMidiTracks(performance, composition)
      .reduce((count, track) => count + track.notes.length, 0)
    const strudelCount = buildPerformancePatternParts(performance, composition)
      .flatMap((part) => part.tokens)
      .filter((token) => token !== '~').length

    expect(midiCount).toBe(performance.performedEvents.length)
    expect(strudelCount).toBe(performance.performedEvents.length)
  })
})
