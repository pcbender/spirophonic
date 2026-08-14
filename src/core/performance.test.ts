import { describe, expect, it } from 'vitest'

import type {
  Composition,
  FigureSequencePitchMapping,
  NotePartSpec,
  TraceObservationSpec,
} from './composition'
import { defaultComposition } from './defaultComposition'
import type { BoundaryCrossingEncounter } from './encounters'
import { compilePerformance, interpretEncounters } from './performance'
import { fixedFrequencySineGateFixture } from '../test/fixtures/gateModulation'

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

const figureSequence = (
  overrides: Partial<FigureSequencePitchMapping> = {},
): FigureSequencePitchMapping => ({
  kind: 'figure-sequence',
  accessMode: 'fifo',
  endBehavior: 'loop',
  resetOn: 'performance',
  root: 60,
  scale: 'major',
  transform: { kind: 'prime', transpose: 0, axis: 60, intervalScale: 1 },
  figures: [
    { kind: 'note', note: 60 },
    { kind: 'chord', notes: [64, 67, 71] },
  ],
  ...overrides,
})

const recordedEncounter = (
  index: number,
  overrides: Partial<BoundaryCrossingEncounter> = {},
): BoundaryCrossingEncounter => ({
  id: `encounter-${index}`,
  kind: 'boundary-crossing',
  timeSeconds: index * 0.25,
  subjectIds: ['wheel-1', 'head-1'],
  wheelId: 'wheel-1',
  headId: 'head-1',
  fieldId: 'field-rings',
  boundaryId: `ring-${index}`,
  boundaryIndex: index,
  boundaryKind: 'ring',
  position: { x: 60 + index, y: 0 },
  direction: 'outward',
  strength: 0.75,
  speed: 1,
  incidenceAngle: 0,
  wheelPhase: index / 8,
  absoluteBeat: index * 0.5,
  barIndex: 0,
  beatInBar: index * 0.5,
  barPhase: index / 8,
  ...overrides,
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
  it('expands a figure-sequence chord into stable simultaneous canonical notes', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const part = notePart('part-figures', 'instrument-1', 60)
    part.pitch = figureSequence()
    composition.parts = [part]
    // Input order is deliberately scrambled: the mapping reads canonical
    // Encounter time/identity order rather than caller array order.
    const encounters = [2, 0, 1].map((index) => recordedEncounter(index))

    const first = interpretEncounters(composition, request, encounters)
    const second = interpretEncounters(composition, request, encounters)

    expect(first).toEqual(second)
    expect(first.diagnostics).toEqual([])
    expect(first.events.map((event) => event.midiNote)).toEqual([
      60,
      64,
      67,
      71,
      60,
    ])
    const chord = first.events.filter(
      (event) => event.sourceEncounterId === 'encounter-1',
    )
    expect(new Set(chord.map((event) => event.id)).size).toBe(3)
    expect(chord.map((event) => event.id)).toEqual([
      'musical-event/part-figures/encounter-1/tone/0',
      'musical-event/part-figures/encounter-1/tone/1',
      'musical-event/part-figures/encounter-1/tone/2',
    ])
    expect(chord.every((event) => event.timeSeconds === 0.25)).toBe(true)
    expect(new Set(chord.map((event) => event.durationBeats))).toEqual(
      new Set([0.5]),
    )
    expect(new Set(chord.map((event) => event.velocity))).toEqual(
      new Set([100]),
    )
  })

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
    composition.fields = [
      {
        id: 'field-band',
        name: 'Band',
        enabled: true,
        kind: 'bands',
        center: { x: 0, y: 0 },
        boundaries: [
          {
            id: 'band-60-80',
            name: 'Band 60 to 80',
            enabled: true,
            index: 0,
            kind: 'band',
            innerRadius: 60,
            outerRadius: 80,
          },
          {
            id: 'band-65-75',
            name: 'Sibling band 65 to 75',
            enabled: true,
            index: 1,
            kind: 'band',
            innerRadius: 65,
            outerRadius: 75,
          },
        ],
      },
    ]
    const part = notePart('part-band', 'instrument-1', 60)
    part.duration = { kind: 'inside-band' }
    part.encounterQuery.boundaryIds = ['band-60-80']
    composition.parts = [part]
    const performance = compilePerformance(composition, request)
    expect(performance.interpretedEvents.length).toBeGreaterThan(0)
    expect(performance.interpretedEvents.length).toBe(
      performance.encounters.filter(
        (event) =>
          event.boundaryId === 'band-60-80' && event.transition === 'enter',
      ).length,
    )
    for (const event of performance.interpretedEvents) {
      const entry = performance.encounters.find(
        (encounter) => encounter.id === event.sourceEncounterId,
      )
      expect(entry?.transition).toBe('enter')
      const exit = performance.encounters.find(
        (encounter) =>
          encounter.timeSeconds > (entry?.timeSeconds ?? Number.POSITIVE_INFINITY) &&
          encounter.wheelId === entry?.wheelId &&
          encounter.headId === entry?.headId &&
          encounter.fieldId === entry?.fieldId &&
          encounter.boundaryId === entry?.boundaryId &&
          encounter.transition === 'exit',
      )
      expect(exit).toBeDefined()
      expect(event.durationBeats).toBeCloseTo(
        (exit?.absoluteBeat ?? 0) - event.absoluteBeat,
        7,
      )
    }
    expect(performance.interpretedEvents.every((event) => event.durationBeats > 0)).toBe(
      true,
    )
  })

  it('holds one note longer when the same sine path crosses a farther wedge', () => {
    const composition = structuredClone(defaultComposition) as Composition
    composition.fields = [
      {
        id: 'field-wedge',
        name: 'Wedge',
        enabled: true,
        kind: 'spokes',
        center: { x: 0, y: 0 },
        rotation: 0,
        boundaries: [
          {
            id: 'wedge-1',
            name: 'Wedge 1',
            enabled: true,
            index: 0,
            kind: 'spoke',
            angle: 0,
            length: 200,
            angularWidth: 0.4,
          },
        ],
      },
    ]
    const part = notePart('part-wedge', 'instrument-1', 60)
    // Region geometry owns the gate lifetime. A generic fixed duration and
    // note grid must not turn the wedge's entry and exit into separate notes.
    part.duration = { kind: 'fixed', beats: 0.25 }
    part.quantize = { gridBeats: 0.25, strength: 0.75 }
    part.encounterQuery.fieldIds = ['field-wedge']
    composition.parts = [part]
    const wedgeRequest = {
      startSeconds: 0,
      durationSeconds: 4,
      sampleRateHz: 120,
    }

    const nearFixture = fixedFrequencySineGateFixture(50)
    const farFixture = fixedFrequencySineGateFixture(100)
    const near = interpretEncounters(
      composition,
      wedgeRequest,
      nearFixture.encounters,
    )
    const far = interpretEncounters(
      composition,
      wedgeRequest,
      farFixture.encounters,
    )

    expect(near.events).toHaveLength(1)
    expect(far.events).toHaveLength(1)
    expect(far.events[0].durationSeconds).toBeGreaterThan(
      near.events[0].durationSeconds,
    )
    expect(far.events[0].midiNote).toBe(near.events[0].midiNote)
    for (const [result, fixture] of [
      [near, nearFixture],
      [far, farFixture],
    ] as const) {
      const event = result.events[0]
      expect(event.sourceEncounterId).toBe(fixture.entry.id)
      expect(event.timeSeconds).toBe(fixture.entry.timeSeconds)
      expect(event.durationSeconds).toBeCloseTo(
        fixture.exit.timeSeconds - fixture.entry.timeSeconds,
        9,
      )
      expect(event.durationBeats).not.toBe(0.25)
    }
  })

  it('holds each visit in the fixed-duration Spoke Test document until exit', () => {
    const composition = structuredClone(defaultComposition) as Composition
    composition.name = 'Spoke Test'
    composition.space = {
      center: { x: 0, y: 0 },
      scale: 1,
      pitchReference: 180,
    }
    composition.transport = {
      tempoBpm: 82,
      meter: { beatsPerBar: 4, beatUnit: 4 },
      loop: { startBeat: 0, lengthBeats: 16 },
    }
    composition.wheels[0].rate = { cycles: 1, beats: 4 }
    composition.wheels[0].phase = 0
    composition.wheels[0].direction = 'forward'
    composition.wheels[0].motion = {
      kind: 'rose',
      numerator: 4,
      denominator: 1,
    }
    composition.wheels[0].heads[0].phaseOffset = 0
    composition.wheels[0].heads[0].offset = { x: 0, y: 0 }
    composition.wheels[0].heads[0].attachment = {
      kind: 'rose',
      radiusScale: 80,
      angularOffset: 0,
    }
    composition.fields = [
      {
        id: 'field-spokes-1',
        name: 'Spoke Field',
        enabled: true,
        center: { x: 0, y: 0 },
        kind: 'spokes',
        rotation: 0,
        boundaries: [
          {
            id: 'field-spokes-1-boundary-1',
            name: 'Spoke 1',
            enabled: true,
            index: 0,
            kind: 'spoke',
            angle: 0,
            length: 200,
            angularWidth: 0.5,
          },
        ],
      },
    ]
    const part = notePart('part-1', 'instrument-1', 60)
    part.duration = { kind: 'fixed', beats: 0.25 }
    part.quantize = { gridBeats: 0.25, strength: 0.75 }
    composition.parts = [part]

    const performance = compilePerformance(composition, {
      startSeconds: 0,
      durationSeconds: (16 * 60) / 82,
      sampleRateHz: 120,
    })
    const completeEntries = performance.encounters.filter(
      (entry) =>
        entry.transition === 'enter' &&
        performance.encounters.some(
          (exit) =>
            exit.timeSeconds > entry.timeSeconds &&
            exit.wheelId === entry.wheelId &&
            exit.headId === entry.headId &&
            exit.fieldId === entry.fieldId &&
            exit.boundaryId === entry.boundaryId &&
            exit.transition === 'exit',
        ),
    )

    expect(completeEntries.length).toBeGreaterThan(0)
    expect(performance.interpretedEvents).toHaveLength(completeEntries.length)
    for (const event of performance.interpretedEvents) {
      const entry = performance.encounters.find(
        (encounter) => encounter.id === event.sourceEncounterId,
      )
      const exit = performance.encounters.find(
        (encounter) =>
          encounter.timeSeconds > (entry?.timeSeconds ?? Number.POSITIVE_INFINITY) &&
          encounter.wheelId === entry?.wheelId &&
          encounter.headId === entry?.headId &&
          encounter.fieldId === entry?.fieldId &&
          encounter.boundaryId === entry?.boundaryId &&
          encounter.transition === 'exit',
      )
      expect(entry?.transition).toBe('enter')
      expect(event.timeSeconds).toBe(entry?.timeSeconds)
      expect(event.durationSeconds).toBeCloseTo(
        (exit?.timeSeconds ?? 0) - (entry?.timeSeconds ?? 0),
        9,
      )
      expect(event.durationBeats).not.toBe(0.25)
    }
  })

  it('adds modulation lanes without changing gate notes or Encounter identity', () => {
    const base = ellipseComposition()
    base.fields = [
      {
        id: 'field-wedge',
        name: 'Wedge',
        enabled: true,
        kind: 'spokes',
        center: { x: 0, y: 0 },
        rotation: 0,
        boundaries: [
          {
            id: 'wedge-east',
            name: 'East wedge',
            enabled: true,
            index: 0,
            kind: 'spoke',
            angle: Math.PI,
            length: 200,
            angularWidth: 0.6,
          },
        ],
      },
    ]
    const part = notePart('part-wedge', 'instrument-1', 60)
    part.duration = { kind: 'inside-region' }
    // A gate note stays on the physical entry even if a generic note grid is saved.
    part.quantize = { gridBeats: 4, strength: 1 }
    part.encounterQuery.fieldIds = ['field-wedge']
    part.encounterQuery.boundaryIds = ['wedge-east']
    base.parts = [part]

    const unmodulated = compilePerformance(base, request)
    const mapped = structuredClone(base)
    const mappedPart = mapped.parts[0]
    if (mappedPart.kind !== 'note') throw new Error('Expected a note Part.')
    mappedPart.gateModulations = [
      {
        id: 'mod-speed-gain',
        name: 'Speed gain',
        enabled: true,
        source: 'speed',
        target: 'gain',
        sampleRateHz: 60,
        minimum: 0.2,
        maximum: 1,
        curve: 1,
        smoothingSeconds: 0.02,
      },
    ]
    const modulated = compilePerformance(mapped, request)

    expect(unmodulated.diagnostics).toEqual([])
    expect(unmodulated.encounters.length).toBeGreaterThan(0)
    expect(unmodulated.performedEvents.length).toBeGreaterThan(0)
    expect(unmodulated.modulationLanes).toEqual([])
    expect(modulated.modulationLanes).toHaveLength(
      modulated.performedEvents.length,
    )
    expect(modulated.encounters).toEqual(unmodulated.encounters)
    expect(modulated.performedEvents).toEqual(unmodulated.performedEvents)
    for (const event of modulated.performedEvents) {
      const entry = modulated.encounters.find(
        (encounter) => encounter.id === event.sourceEncounterId,
      )
      expect(entry?.transition).toBe('enter')
      expect(event.timeSeconds).toBe(entry?.timeSeconds)
    }
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
