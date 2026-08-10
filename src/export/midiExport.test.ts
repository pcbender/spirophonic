import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { beatsToSeconds } from '../core/transport'
import { gatedModulationComposition, speedMapping } from '../test/fixtures/gateModulation'
import {
  buildPerformanceMidi,
  buildPerformanceMidiTracks,
} from './midiExport'

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

  it('keeps one note while writing ordered lane controllers, bends, and entry velocity', () => {
    const composition = gatedModulationComposition()
    const part = composition.parts[0]
    if (part.kind !== 'note') throw new Error('Expected a note Part.')
    part.gateModulations = [
      speedMapping,
      {
        ...speedMapping,
        id: 'mod-pitch',
        name: 'Pitch contour',
        target: 'pitch-offset',
        minimum: -0.5,
        maximum: 0.5,
      },
      {
        ...speedMapping,
        id: 'mod-velocity',
        name: 'Entry velocity',
        target: 'initial-velocity',
        minimum: 40,
        maximum: 100,
      },
    ]
    const performance = compileDefault(composition)
    const diagnostics: Parameters<typeof buildPerformanceMidiTracks>[4] = []
    const tracks = buildPerformanceMidiTracks(
      performance,
      composition,
      480,
      2,
      diagnostics,
    )
    const track = tracks[0]
    const brightness = performance.modulationLanes.find(
      (lane) => lane.target === 'brightness',
    )!
    const velocity = performance.modulationLanes.find(
      (lane) => lane.target === 'initial-velocity',
    )!

    expect(track.notes).toHaveLength(performance.performedEvents.length)
    expect(track.notes[0].velocity).toBe(velocity.samples[0].value)
    expect(
      track.controllers?.filter((controller) => controller.controller === 74),
    ).toHaveLength(brightness.samples.length + 1)
    expect(
      track.controllers?.filter((controller) => controller.controller === 74).at(-1),
    ).toEqual({
      tick: Math.round(
        (performance.performedEvents[0].absoluteBeat +
          performance.performedEvents[0].durationBeats) *
          480,
      ),
      channel: 0,
      controller: 74,
      value: 127,
    })
    expect(track.pitchBends?.length).toBeGreaterThan(2)
    expect(track.pitchBends?.map((bend) => bend.tick)).toEqual(
      [...(track.pitchBends ?? [])].map((bend) => bend.tick).sort((a, b) => a - b),
    )
    expect(track.pitchBends?.at(-1)).toEqual(
      expect.objectContaining({ channel: 0, value: 8192 }),
    )
    expect(track.notes[0].pitchBend).toBeUndefined()
    expect(diagnostics).toEqual([])
  })
})

const ascii = (bytes: Uint8Array) =>
  [...bytes].map((byte) => String.fromCharCode(byte)).join('')
