import type {
  Composition,
  GateModulationMapping,
  NotePartSpec,
} from '../../core/composition'
import { defaultComposition } from '../../core/defaultComposition'
import { boundaryEncountersForPath } from '../../core/encounters'
import type { BoundaryGeometry } from '../../core/fields'
import type { NoteMusicalEvent } from '../../core/performance'

export const sineWedgeBoundary: BoundaryGeometry = Object.freeze({
  kind: 'spoke',
  fieldId: 'field-wedge',
  boundaryId: 'wedge-1',
  name: 'Wedge 1',
  index: 0,
  center: Object.freeze({ x: 0, y: 0 }),
  angle: 0,
  angularWidth: 0.4,
  length: 250,
  direction: Object.freeze({ x: 1, y: 0 }),
})

export const speedMapping: GateModulationMapping = Object.freeze({
  id: 'mod-speed',
  name: 'Speed brightness',
  enabled: true,
  source: 'speed',
  target: 'brightness',
  sampleRateHz: 120,
  minimum: 0,
  maximum: 1,
  curve: 1,
  smoothingSeconds: 0,
})

/** Same 2 Hz transverse sine and speed, placed at a selected x radius. */
export const fixedFrequencySineGateFixture = (radius: number) => {
  const stateAt = (timeSeconds: number) => {
    const phase = Math.PI * 4 * timeSeconds
    return Object.freeze({
      timeSeconds,
      position: Object.freeze({
        x: radius,
        y: -40 + 20 * timeSeconds + Math.sin(phase),
      }),
      velocity: Object.freeze({
        x: 0,
        y: 20 + 4 * Math.PI * Math.cos(phase),
      }),
      wheelPhase: timeSeconds,
    })
  }
  const encounters = boundaryEncountersForPath({
    transport: defaultComposition.transport,
    wheelId: 'wheel-1',
    headId: 'head-1',
    boundary: sineWedgeBoundary,
    sampleTimes: Array.from({ length: 481 }, (_, index) => index / 120),
    stateAt,
  }).encounters
  const entry = encounters.find((encounter) => encounter.transition === 'enter')
  const exit = encounters.find((encounter) => encounter.transition === 'exit')
  if (!entry || !exit) throw new Error('The sine fixture must cross both wedge edges.')

  const note: NoteMusicalEvent = Object.freeze({
    id: `note-radius-${radius}`,
    sourceEncounterId: entry.id,
    partId: 'part-wedge',
    instrumentId: 'instrument-1',
    kind: 'note',
    timeSeconds: entry.timeSeconds,
    absoluteBeat: entry.absoluteBeat,
    barIndex: entry.barIndex,
    beatInBar: entry.beatInBar,
    barPhase: entry.barPhase,
    midiNote: 60,
    frequencyHz: 261.625565,
    velocity: 100,
    durationBeats: exit.absoluteBeat - entry.absoluteBeat,
    durationSeconds: exit.timeSeconds - entry.timeSeconds,
    rest: false,
    probability: 1,
  })

  return Object.freeze({
    radius,
    stateAt,
    encounters,
    entry,
    exit,
    note,
    boundary: sineWedgeBoundary,
  })
}

export const gatedModulationComposition = (): Composition => {
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
      id: 'field-wedge',
      name: 'Wedge',
      enabled: true,
      kind: 'spokes',
      center: { x: 0, y: 0 },
      rotation: 0,
      boundaries: [
        {
          id: 'wedge-west',
          name: 'West wedge',
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
  const part = structuredClone(composition.parts[0]) as NotePartSpec
  part.id = 'part-gate'
  part.name = 'Gate Part'
  // The region owns note-off even when ordinary crossings on this Part use a
  // fixed, quantized rhythm. This mirrors imported documents authored before
  // the region-duration choice was selected explicitly.
  part.duration = { kind: 'fixed', beats: 0.25 }
  part.quantize = { gridBeats: 0.25, strength: 0.75 }
  part.encounterQuery.fieldIds = ['field-wedge']
  part.encounterQuery.boundaryIds = ['wedge-west']
  part.gateModulations = [{ ...speedMapping }]
  composition.parts = [part]
  return composition
}
