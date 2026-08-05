import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { beatsToSeconds } from '../core/transport'
import { buildPerformanceMidi } from './midiExport'

const compileDefault = (composition: Composition) =>
  compilePerformance(composition, {
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

describe('canonical performance MIDI export', () => {
  it('is byte-identical for the same Composition and performance', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const performance = compileDefault(composition)

    expect(buildPerformanceMidi(performance, composition)).toEqual(
      buildPerformanceMidi(performance, composition),
    )
  })

  it('writes one tempo track plus one enabled note-Part track', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const bytes = buildPerformanceMidi(compileDefault(composition), composition)

    expect([...bytes.slice(0, 4)]).toEqual([0x4d, 0x54, 0x68, 0x64])
    expect(bytes[10] * 256 + bytes[11]).toBe(2)
    expect(ascii(bytes)).toContain('Boundary Melody')
  })

  it('changes tempo metadata without changing compiled Encounter order', () => {
    const first = structuredClone(defaultComposition) as Composition
    const second = structuredClone(defaultComposition) as Composition
    second.transport.tempoBpm = 90
    const firstPerformance = compileDefault(first)
    const secondPerformance = compileDefault(second)

    expect(secondPerformance.encounters.map(({ id }) => id.replace(/\d+\.\d{9}/, 'time')))
      .toEqual(firstPerformance.encounters.map(({ id }) => id.replace(/\d+\.\d{9}/, 'time')))
    expect(buildPerformanceMidi(firstPerformance, first)).not.toEqual(
      buildPerformanceMidi(secondPerformance, second),
    )
  })
})

const ascii = (bytes: Uint8Array) =>
  [...bytes].map((byte) => String.fromCharCode(byte)).join('')
