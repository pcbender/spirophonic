import { describe, expect, it } from 'vitest'

import type {
  Composition,
  NotePartSpec,
  TraceObservationSpec,
} from './composition'
import { defaultComposition } from './defaultComposition'
import { compilePerformance } from './performance'

const request = {
  startSeconds: 0,
  durationSeconds: 2,
  sampleRateHz: 40,
}

const notePart = (
  id: string,
  instrumentId: string,
  note: number,
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
  instrumentId,
  onset: { kind: 'encounter-time' },
  pitch: { kind: 'fixed-midi', note },
  velocity: { kind: 'encounter-strength', min: 40, max: 120, gamma: 1 },
  duration: { kind: 'fixed', beats: 0.5 },
})

const ellipseComposition = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.wheels[0].motion = {
    kind: 'lissajous',
    frequencyX: 1,
    frequencyY: 1,
    delta: Math.PI / 2,
  }
  composition.wheels[0].heads[0].attachment = {
    kind: 'lissajous',
    scaleX: 100,
    scaleY: 50,
    phaseX: 0,
    phaseY: 0,
  }
  composition.fields = [
    {
      id: 'field-rings',
      name: 'Rings',
      enabled: true,
      kind: 'rings',
      center: { x: 0, y: 0 },
      boundaries: [
        {
          id: 'ring-75',
          name: 'Ring 75',
          enabled: true,
          index: 0,
          kind: 'ring',
          radius: 75,
        },
      ],
    },
  ]
  composition.instruments.push({
    ...structuredClone(composition.instruments[0]),
    id: 'instrument-2',
    name: 'Instrument 2',
  })
  return composition
}

describe('canonical performance compilation', () => {
  it('lets two Parts interpret one Encounter as different Instruments and pitches', () => {
    const composition = ellipseComposition()
    composition.parts = [
      notePart('part-low', 'instrument-1', 48),
      notePart('part-high', 'instrument-2', 72),
    ]
    const performance = compilePerformance(composition, request)
    const sourceId = performance.encounters[0].id
    const interpretations = performance.interpretedEvents.filter(
      (event) => event.sourceEncounterId === sourceId,
    )

    expect(performance.diagnostics).toEqual([])
    expect(performance.encounters).toHaveLength(4)
    expect(performance.interpretedEvents).toHaveLength(8)
    expect(interpretations.map((event) => event.instrumentId)).toEqual([
      'instrument-2',
      'instrument-1',
    ])
    expect(interpretations.map((event) => event.midiNote)).toEqual([72, 48])
    expect(interpretations.every((event) => !event.rest)).toBe(true)
    expect(interpretations.every((event) => event.probability === 1)).toBe(true)
    expect(performance.performedEvents).toBe(performance.interpretedEvents)
  })

  it('keeps shared Encounter and existing event identities when another Part ignores it', () => {
    const base = ellipseComposition()
    base.parts = [notePart('part-main', 'instrument-1', 60)]
    const first = compilePerformance(base, request)
    const expanded = structuredClone(base)
    const ignored = notePart('part-ignored', 'instrument-2', 84)
    ignored.encounterQuery.directions = ['clockwise']
    expanded.parts.push(ignored)
    const second = compilePerformance(expanded, request)

    expect(second.encounters).toEqual(first.encounters)
    expect(
      second.interpretedEvents.filter((event) => event.partId === 'part-main'),
    ).toEqual(first.interpretedEvents)
    expect(
      second.interpretedEvents.some((event) => event.partId === 'part-ignored'),
    ).toBe(false)
  })

  it('mutes and solos Parts without touching Encounters or Part configuration', () => {
    const base = ellipseComposition()
    base.parts = [
      notePart('part-low', 'instrument-1', 48),
      notePart('part-high', 'instrument-2', 72),
    ]
    const full = compilePerformance(base, request)

    const muted = structuredClone(base)
    muted.parts[1].mute = true
    const mutedPerformance = compilePerformance(muted, request)

    // Geometry is untouched and the surviving Part keeps its exact events.
    expect(mutedPerformance.encounters).toEqual(full.encounters)
    expect(
      mutedPerformance.interpretedEvents.map((event) => event.partId),
    ).toEqual(
      full.interpretedEvents
        .filter((event) => event.partId === 'part-low')
        .map((event) => event.partId),
    )
    expect(mutedPerformance.interpretedEvents).toEqual(
      full.interpretedEvents.filter((event) => event.partId === 'part-low'),
    )
    // The muted Part keeps every setting it had.
    expect(muted.parts[1]).toMatchObject({
      ...base.parts[1],
      mute: true,
    })

    // Solo wins over an unmuted sibling.
    const soloed = structuredClone(base)
    soloed.parts[1].solo = true
    const soloPerformance = compilePerformance(soloed, request)

    expect(soloPerformance.encounters).toEqual(full.encounters)
    expect(soloPerformance.interpretedEvents).toEqual(
      full.interpretedEvents.filter((event) => event.partId === 'part-high'),
    )

    // Solo also overrides that same Part being muted.
    const soloedAndMuted = structuredClone(soloed)
    soloedAndMuted.parts[1].mute = true

    expect(compilePerformance(soloedAndMuted, request).interpretedEvents).toEqual(
      soloPerformance.interpretedEvents,
    )

    // A disabled Part cannot solo the mix into silence.
    const disabledSolo = structuredClone(base)
    disabledSolo.parts[1].enabled = false
    disabledSolo.parts[1].solo = true

    expect(compilePerformance(disabledSolo, request).interpretedEvents).toEqual(
      full.interpretedEvents.filter((event) => event.partId === 'part-low'),
    )
  })

  it('quantizes absolute Transport beats in a mid-performance window', () => {
    const composition = ellipseComposition()
    const part = notePart('part-grid', 'instrument-1', 60)
    part.quantize = { gridBeats: 0.5, strength: 1 }
    composition.parts = [part]
    const performance = compilePerformance(composition, {
      startSeconds: 4,
      durationSeconds: 2,
      sampleRateHz: 40,
    })

    expect(performance.interpretedEvents).toHaveLength(4)
    for (const event of performance.interpretedEvents) {
      expect(event.absoluteBeat).toBeGreaterThan(8)
      expect(event.absoluteBeat * 2).toBe(Math.round(event.absoluteBeat * 2))
      expect(event.timeSeconds).toBe(event.absoluteBeat * 0.5)
    }
  })

  it('maps until-next duration with a deterministic final-event cap', () => {
    const composition = ellipseComposition()
    const part = notePart('part-duration', 'instrument-1', 60)
    part.duration = { kind: 'until-next', maxBeats: 0.75 }
    composition.parts = [part]
    const events = compilePerformance(composition, request).interpretedEvents

    expect(events.at(-1)?.durationBeats).toBe(0.75)
    expect(events.every((event) => event.durationBeats <= 0.75)).toBe(true)
    expect(events.every((event) => event.durationSeconds > 0)).toBe(true)
  })

  it('maps inside-band duration to the next physical Field crossing', () => {
    const composition = ellipseComposition()
    const part = notePart('part-band', 'instrument-1', 60)
    part.duration = { kind: 'inside-band' }
    composition.parts = [part]
    const performance = compilePerformance(composition, request)
    const [first, second] = performance.interpretedEvents

    expect(first.durationBeats).toBeCloseTo(
      second.absoluteBeat - first.absoluteBeat,
      7,
    )
    expect(performance.interpretedEvents.every((event) => event.durationBeats > 0)).toBe(
      true,
    )
  })

  it('returns deep-equal layers for the same Composition and request', () => {
    const composition = ellipseComposition()
    composition.parts = [notePart('part-main', 'instrument-1', 60)]

    expect(compilePerformance(composition, request)).toEqual(
      compilePerformance(composition, request),
    )
  })

  it('returns actionable referential and musical-range diagnostics', () => {
    const missingInstrument = ellipseComposition()
    missingInstrument.parts = [notePart('part-bad-ref', 'missing', 60)]
    const invalidRange = ellipseComposition()
    const wide = notePart('part-wide', 'instrument-1', 60)
    wide.pitch = {
      kind: 'boundary-degree',
      root: 120,
      scale: 'major',
      octaves: 1,
    }
    invalidRange.parts = [wide]

    expect(compilePerformance(missingInstrument, request)).toMatchObject({
      interpretedEvents: [],
      diagnostics: [
        {
          code: 'invalid-composition',
          path: '$.parts[0].instrumentId',
          message: expect.stringContaining('missing Instrument'),
        },
      ],
    })
    expect(compilePerformance(invalidRange, request)).toMatchObject({
      interpretedEvents: [],
      diagnostics: [
        {
          code: 'invalid-musical-range',
          path: '$.parts[0].pitch.octaves',
          partId: 'part-wide',
        },
      ],
    })
  })
})

describe('a Part hears the Encounter kinds it accepts', () => {
  const observation = (): TraceObservationSpec => ({
    enabled: true,
    retention: 'window',
    sampleRateHz: 60,
    maxSegments: 4_000,
    allowSelf: false,
  })

  /**
   * Two Wheels whose Heads sweep overlapping circles, so one Head genuinely
   * runs through the other's retained path. No Fields at all, so every note
   * produced here can only have come from a trace crossing.
   */
  const traceCrossingComposition = (): Composition => {
    const composition = structuredClone(defaultComposition) as Composition
    composition.wheels[0].motion = {
      kind: 'lissajous',
      frequencyX: 1,
      frequencyY: 1,
      delta: Math.PI / 2,
    }
    composition.wheels[0].heads[0] = {
      ...composition.wheels[0].heads[0],
      id: 'head-a',
      name: 'Head A',
      attachment: {
        kind: 'lissajous',
        scaleX: 100,
        scaleY: 100,
        phaseX: 0,
        phaseY: 0,
      },
      observation: observation(),
    }
    composition.wheels.push({
      ...structuredClone(composition.wheels[0]),
      id: 'wheel-2',
      name: 'Wheel 2',
      center: { x: 90, y: 0 },
      rate: { cycles: 3, beats: 4 },
      heads: [
        {
          ...structuredClone(composition.wheels[0].heads[0]),
          id: 'head-b',
          name: 'Head B',
          observation: observation(),
        },
      ],
    })
    composition.fields = []
    composition.parts = []
    return composition
  }

  const partAccepting = (
    kinds: NotePartSpec['encounterQuery']['kinds'],
  ): NotePartSpec => ({
    id: 'part-1',
    name: 'Part 1',
    enabled: true,
    mute: false,
    solo: false,
    kind: 'note',
    encounterQuery: {
      kinds,
      wheelIds: [],
      headIds: [],
      fieldIds: [],
      boundaryIds: [],
      directions: [],
      minStrength: 0,
    },
    instrumentId: 'instrument-1',
    onset: { kind: 'encounter-time' },
    pitch: { kind: 'fixed-midi', note: 60 },
    velocity: { kind: 'encounter-strength', min: 48, max: 118, gamma: 1 },
    duration: { kind: 'fixed', beats: 0.25 },
  })

  it('turns trace crossings into notes when the Part accepts them', () => {
    const composition = traceCrossingComposition()
    composition.parts = [partAccepting(['trace-crossing'])]
    const performance = compilePerformance(
      composition,
      request,
    )

    // The scan finds crossings, and every one of them reaches the mix.
    expect(performance.traceEncounters.length).toBeGreaterThan(0)
    expect(performance.performedEvents.length).toBe(
      performance.traceEncounters.length,
    )
    expect(
      performance.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([])
  })

  it('ignores trace crossings when the Part accepts only Boundary crossings', () => {
    const composition = traceCrossingComposition()
    composition.parts = [partAccepting(['boundary-crossing'])]
    const performance = compilePerformance(
      composition,
      request,
    )

    // The crossings still happen; this Part simply is not listening for them.
    expect(performance.traceEncounters.length).toBeGreaterThan(0)
    expect(performance.performedEvents).toEqual([])
  })

  it('gives a trace crossing a degree, so degree pitch varies by Head met', () => {
    const composition = traceCrossingComposition()
    const part = partAccepting(['trace-crossing'])
    composition.parts = [
      {
        ...part,
        pitch: {
          kind: 'boundary-degree',
          root: 48,
          scale: 'pentatonic-minor',
          octaves: 3,
        },
      },
    ]
    const performance = compilePerformance(
      composition,
      request,
    )

    // Degree comes from which Head's Trace was crossed, so notes are real
    // pitches rather than every crossing landing on the root.
    expect(performance.performedEvents.length).toBeGreaterThan(0)
    for (const event of performance.performedEvents) {
      expect(event.midiNote).toBeGreaterThanOrEqual(48)
      expect(event.midiNote).toBeLessThanOrEqual(127)
    }
  })
})
describe('view zoom and pitch reference are independent', () => {
  const spatialComposition = (space: Composition['space']): Composition => {
    const composition = structuredClone(defaultComposition) as Composition
    composition.space = space
    const base = composition.parts[0] as NotePartSpec
    composition.parts = [
      {
        ...base,
        pitch: {
          kind: 'spatial',
          source: 'radius',
          root: 48,
          scale: 'major',
          octaves: 3,
        },
      },
    ]
    return composition
  }

  const pitches = (space: Composition['space']) =>
    compilePerformance(spatialComposition(space), request).performedEvents.map(
      (event) => event.midiNote,
    )

  it('spreads Spatial pitch when the reference matches the geometry', () => {
    // A reference far below the geometry saturates: every radius normalises to
    // nearly 1 and lands on the same degree.
    const tooSmall = new Set(pitches({ center: { x: 0, y: 0 }, scale: 1, pitchReference: 1 }))
    const matched = new Set(pitches({ center: { x: 0, y: 0 }, scale: 1, pitchReference: 180 }))

    expect(tooSmall.size).toBe(1)
    expect(matched.size).toBeGreaterThan(1)
  })

  it('leaves pitch untouched when only the view zoom changes', () => {
    const atOne = pitches({ center: { x: 0, y: 0 }, scale: 1, pitchReference: 180 })
    const zoomedIn = pitches({ center: { x: 0, y: 0 }, scale: 4, pitchReference: 180 })

    // This is the whole point of the split: zoom is a drawing concern.
    expect(zoomedIn).toEqual(atOne)
  })

  it('falls back to scale when a Composition predates the split', () => {
    // Written before `pitchReference` existed, so it must sound exactly as it
    // did when one field served both purposes.
    const legacy = pitches({ center: { x: 0, y: 0 }, scale: 7 })
    const explicit = pitches({ center: { x: 0, y: 0 }, scale: 7, pitchReference: 7 })

    expect(legacy).toEqual(explicit)
  })
})
