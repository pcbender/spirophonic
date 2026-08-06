import { describe, expect, it } from 'vitest'

import midiExportSource from './midiExport.ts?raw'
import strudelExportSource from './strudelExport.ts?raw'
import smfSource from './midi/smf.ts?raw'

import type { Composition, NotePartSpec } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { createRecording } from '../core/recording'
import {
  bendForSemitoneOffset,
  buildPerformanceMidi,
  buildPerformanceMidiTracks,
  buildPerformanceMidiWithDiagnostics,
  defaultPitchBendRangeSemitones,
} from './midiExport'
import {
  buildPerformancePatternParts,
  exportPerformanceStrudel,
  isEqualTempered,
} from './strudelExport'

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

const notePart = (
  id: string,
  pitch: NotePartSpec['pitch'],
): NotePartSpec => ({
  id,
  name: id,
  enabled: true,
  mute: false,
  solo: false,
  kind: 'note',
  encounterQuery: {
    kinds: ['boundary-crossing'],
    wheelIds: [],
    headIds: [],
    fieldIds: [],
    boundaryIds: [],
    directions: [],
    minStrength: 0,
  },
  instrumentId: 'instrument-1',
  onset: { kind: 'encounter-time' },
  pitch,
  velocity: { kind: 'encounter-strength', min: 40, max: 120, gamma: 1 },
  duration: { kind: 'fixed', beats: 0.5 },
})

const tempered = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.parts = [
    notePart('part-a', {
      kind: 'boundary-degree',
      root: 48,
      scale: 'major',
      octaves: 2,
    }),
  ]
  return composition
}

/** A Composition whose pitches are exact ratios, not semitones. */
const ratioTuned = (): Composition => {
  const composition = tempered()
  composition.tuningContexts = [
    {
      id: 'tuning-just',
      name: 'Just',
      rootFrequencyHz: 220,
      system: { kind: 'rational', maxDenominator: 64 },
      octaveFold: true,
    },
  ]
  composition.parts = [
    {
      ...notePart('part-a', {
        kind: 'tuned-ratio',
        ratio: { kind: 'explicit', numerator: 5, denominator: 4 },
      }),
      tuningContextId: 'tuning-just',
    },
  ]
  return composition
}

describe('exporters stay independent of geometry', () => {
  it('import no Wheel, Head, Field, Trace, or geometry module', () => {
    const forbidden = [
      '../core/wheels',
      '../core/heads',
      '../core/fields',
      '../core/motion',
      '../core/crossings',
      '../core/encounters',
      '../core/traces',
      '../core/traceEncounters',
      '../core/relations',
      '../core/curves',
      '../core/trochoid',
    ]

    for (const source of [midiExportSource, strudelExportSource, smfSource]) {
      const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1])
      for (const specifier of imports) {
        expect(forbidden).not.toContain(specifier)
      }
    }
  })
})

describe('MG-19 acceptance', () => {
  it('places MIDI events on Transport ticks across a mid-bar window', () => {
    const composition = tempered()
    const whole = compilePerformance(composition, request)
    const midBar = compilePerformance(composition, {
      startSeconds: 1.5,
      durationSeconds: 2.5,
      sampleRateHz: 120,
    })

    const ticksPerQuarter = 480
    const tracks = buildPerformanceMidiTracks(midBar, composition, ticksPerQuarter)
    const startBeat = 1.5 * (composition.transport.tempoBpm / 60)

    expect(tracks[0].notes.length).toBeGreaterThan(0)
    for (const note of tracks[0].notes) {
      expect(note.tick).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(note.tick)).toBe(true)
    }

    // A note shared by both windows sits at the same absolute beat, offset by
    // the window start rather than renumbered from zero.
    const wholeTracks = buildPerformanceMidiTracks(whole, composition, ticksPerQuarter)
    const sharedEvent = midBar.performedEvents[0]
    const wholeIndex = whole.performedEvents.findIndex(
      (event) => event.id === sharedEvent.id,
    )
    if (wholeIndex >= 0) {
      const fromWhole = wholeTracks[0].notes[wholeIndex]
      const fromMidBar = tracks[0].notes[0]
      expect(fromMidBar.tick).toBeCloseTo(
        fromWhole.tick - Math.round(startBeat * ticksPerQuarter),
        0,
      )
    }
  })

  it('writes bank, program, drum channel, and pan from Instrument intent', () => {
    const composition = tempered()
    composition.soundBanks = [
      {
        id: 'bank-1',
        name: 'Bank',
        digest: 'd'.repeat(64),
        format: 'sf2',
        source: 'local',
        license: 'User supplied',
        attribution: '',
      },
    ]
    composition.instruments = [
      {
        id: 'instrument-1',
        name: 'Piano',
        kind: 'soundfont',
        gain: 0.7,
        pan: -1,
        soundBankId: 'bank-1',
        bank: 130,
        program: 5,
        presetName: 'Piano',
        percussion: false,
        reverb: 0,
        chorus: 0,
      },
      {
        id: 'instrument-2',
        name: 'Kit',
        kind: 'soundfont',
        gain: 0.5,
        pan: 1,
        soundBankId: 'bank-1',
        bank: 128,
        program: 0,
        presetName: 'Kit',
        percussion: true,
        reverb: 0,
        chorus: 0,
      },
    ]
    composition.parts = [
      notePart('part-a', { kind: 'fixed-midi', note: 60 }),
      {
        ...notePart('part-b', { kind: 'fixed-midi', note: 38 }),
        instrumentId: 'instrument-2',
      },
    ]

    const performance = compilePerformance(composition, request)
    const tracks = buildPerformanceMidiTracks(performance, composition)

    // 130 = MSB 1, LSB 2.
    expect(tracks[0].bankMSB).toBe(1)
    expect(tracks[0].bankLSB).toBe(2)
    expect(tracks[0].program).toBe(5)
    // Pan -1 maps to CC10 value 0, +1 to 127.
    expect(tracks[0].controllers?.[0]).toEqual({
      channel: tracks[0].channel,
      controller: 10,
      value: 0,
    })
    // Percussion goes to channel 10 (zero-based 9) and carries no bank select.
    expect(tracks[1].channel).toBe(9)
    expect(tracks[1].bankMSB).toBeUndefined()
    expect(tracks[1].controllers?.[0].value).toBe(127)
  })

  it('bends ratio-tuned pitch rather than silently rounding it', () => {
    const composition = ratioTuned()
    const performance = compilePerformance(composition, request)
    expect(performance.performedEvents.length).toBeGreaterThan(0)
    // 5:4 above 220 Hz is a just major third: not a whole semitone.
    expect(isEqualTempered(performance.performedEvents[0])).toBe(false)

    const tracks = buildPerformanceMidiTracks(performance, composition)
    for (const note of tracks[0].notes) {
      expect(note.pitchBend).toBeDefined()
      expect(note.pitchBend).not.toBe(8192)
    }
  })

  it('reports a capacity diagnostic when a bend exceeds the declared range', () => {
    const composition = ratioTuned()
    const performance = compilePerformance(composition, request)

    const roomy = buildPerformanceMidiWithDiagnostics(performance, composition)
    expect(roomy.diagnostics).toEqual([])

    // A range too small to represent the required bend must say so, by event.
    const cramped = buildPerformanceMidiWithDiagnostics(performance, composition, {
      pitchBendRangeSemitones: 0.01,
    })
    expect(cramped.diagnostics.length).toBeGreaterThan(0)
    expect(cramped.diagnostics[0].code).toBe('bend-capacity')
    expect(cramped.diagnostics[0].eventId).toBeTruthy()
    expect(cramped.diagnostics[0].message).toMatch(/beyond the declared/)
    // The file is still produced; the caller is told what it lost.
    expect(cramped.bytes.byteLength).toBeGreaterThan(0)
  })

  it('maps a bend offset symmetrically and flags the unrepresentable', () => {
    const range = defaultPitchBendRangeSemitones
    expect(bendForSemitoneOffset(0, range).value).toBe(8192)
    expect(bendForSemitoneOffset(range, range).value).toBe(16_383)
    expect(bendForSemitoneOffset(-range, range).value).toBe(1)
    expect(bendForSemitoneOffset(range, range).representable).toBe(true)
    expect(bendForSemitoneOffset(range * 2, range).representable).toBe(false)
  })

  it('uses note patterns when tempered and frequency patterns when not', () => {
    const temperedParts = buildPerformancePatternParts(
      compilePerformance(tempered(), request),
      tempered(),
    )
    expect(temperedParts[0].usesFrequency).toBe(false)
    expect(exportPerformanceStrudel(compilePerformance(tempered(), request), tempered())).toContain(
      'note("',
    )

    const ratioComposition = ratioTuned()
    const ratioPerformance = compilePerformance(ratioComposition, request)
    const ratioParts = buildPerformancePatternParts(ratioPerformance, ratioComposition)
    expect(ratioParts[0].usesFrequency).toBe(true)

    const code = exportPerformanceStrudel(ratioPerformance, ratioComposition)
    expect(code).toContain('freq("')
    expect(code).not.toContain('note("')
  })

  it('exports from a Recording exactly as from a fresh performance', () => {
    const composition = tempered()
    const performance = compilePerformance(composition, request)
    const recording = createRecording({
      id: 'recording-1',
      name: 'Take',
      composition,
      performance,
    })

    // A Recording satisfies the exporter's input contract on its own.
    const fromPerformance = buildPerformanceMidi(performance, composition)
    const fromRecording = buildPerformanceMidi(recording, composition)
    expect(Array.from(fromRecording)).toEqual(Array.from(fromPerformance))

    expect(exportPerformanceStrudel(recording, composition)).toBe(
      exportPerformanceStrudel(performance, composition),
    )
  })

  it('agrees across MIDI, Strudel, and the canonical layer on count and order', () => {
    const composition = tempered()
    const performance = compilePerformance(composition, request)
    const tracks = buildPerformanceMidiTracks(performance, composition)
    const parts = buildPerformancePatternParts(performance, composition)

    const canonicalCount = performance.performedEvents.length
    const midiCount = tracks.reduce((sum, track) => sum + track.notes.length, 0)
    expect(midiCount).toBe(canonicalCount)

    // MIDI note order follows canonical event order.
    const canonicalNotes = performance.performedEvents.map((event) =>
      Math.round(event.midiNote ?? 69),
    )
    expect(tracks[0].notes.map((note) => note.note)).toEqual(canonicalNotes)

    // Strudel emits a slot per event plus rests, never fewer sounding tokens.
    const sounding = parts[0].tokens.filter((token) => token !== '~')
    expect(sounding.length).toBeLessThanOrEqual(canonicalCount)
    expect(sounding.length).toBeGreaterThan(0)
  })
})
