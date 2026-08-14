import type {
  Composition,
  FigureSequencePitchMapping,
  PitchFigure,
  WheelSpec,
} from './composition'
import { fromScaleDegree, midiToFrequency } from './scales'

export type FigureSequenceEncounter = Readonly<{
  wheelId: string
  boundaryIndex: number
  absoluteBeat: number
  barIndex: number
}>

export type ResolvedFigurePitch = Readonly<{
  midiNote: number
  frequencyHz: number
}>

const positiveModulo = (value: number, modulus: number) =>
  ((value % modulus) + modulus) % modulus

const wheelForEncounter = (
  composition: Composition,
  encounter: FigureSequenceEncounter,
): WheelSpec => {
  const wheel = composition.wheels.find(
    (candidate) => candidate.id === encounter.wheelId,
  )
  if (!wheel) {
    throw new RangeError(
      `Figure sequence cannot reset on missing Wheel "${encounter.wheelId}".`,
    )
  }
  return wheel
}

const wheelCycleKey = (
  composition: Composition,
  encounter: FigureSequenceEncounter,
) => {
  const wheel = wheelForEncounter(composition, encounter)
  const direction = wheel.direction === 'reverse' ? -1 : 1
  const cyclePosition =
    wheel.phase +
    direction * encounter.absoluteBeat * (wheel.rate.cycles / wheel.rate.beats)
  // In reverse, ceil keeps the phase interval immediately below zero in the
  // opening cycle. Forward uses the corresponding interval immediately above.
  const cycleIndex = direction > 0
    ? Math.floor(cyclePosition + 1e-12)
    : Math.ceil(cyclePosition - 1e-12)

  return `${wheel.id}:${cycleIndex}`
}

const resetKey = (
  mapping: FigureSequencePitchMapping,
  encounter: FigureSequenceEncounter,
  composition: Composition,
) => {
  if (mapping.resetOn === 'bar') return `bar:${encounter.barIndex}`
  if (mapping.resetOn === 'wheel-cycle') {
    return `wheel-cycle:${wheelCycleKey(composition, encounter)}`
  }
  return 'performance'
}

const pitchClassMidi = (root: number, pitchClass: number) => {
  let note = Math.floor(root / 12) * 12 + pitchClass
  if (note < root) note += 12
  return note
}

export const resolvePitchFigure = (
  figure: PitchFigure,
  mapping: FigureSequencePitchMapping,
): ReadonlyArray<number> => {
  if (figure.kind === 'note') return Object.freeze([figure.note])
  if (figure.kind === 'chord') return Object.freeze([...figure.notes])
  if (figure.kind === 'scale-degree') {
    return Object.freeze([
      fromScaleDegree(figure.degree, mapping.scale, mapping.root),
    ])
  }
  if (figure.kind === 'pitch-class-set') {
    return Object.freeze(
      figure.pitchClasses.map((pitchClass) =>
        pitchClassMidi(mapping.root, pitchClass),
      ),
    )
  }
  return Object.freeze(
    figure.intervals.map((interval) => mapping.root + interval),
  )
}

const transformPitch = (
  note: number,
  mapping: FigureSequencePitchMapping,
) => {
  const { transform } = mapping
  const inversionSign =
    transform.kind === 'inversion' ||
    transform.kind === 'retrograde-inversion'
      ? -1
      : 1
  const transformed = Math.round(
    transform.axis +
      inversionSign * (note - transform.axis) * transform.intervalScale +
      transform.transpose,
  )

  if (!Number.isFinite(transformed) || transformed < 0 || transformed > 127) {
    throw new RangeError(
      `Figure sequence transform produced MIDI note ${transformed}; expected 0 through 127.`,
    )
  }
  return transformed
}

export const transformedFigureSequence = (
  mapping: FigureSequencePitchMapping,
): ReadonlyArray<ReadonlyArray<ResolvedFigurePitch>> => {
  const ordered =
    mapping.transform.kind === 'retrograde' ||
    mapping.transform.kind === 'retrograde-inversion'
      ? [...mapping.figures].reverse()
      : mapping.figures

  return Object.freeze(
    ordered.map((figure) =>
      Object.freeze(
        resolvePitchFigure(figure, mapping).map((note) => {
          const midiNote = transformPitch(note, mapping)
          return Object.freeze({
            midiNote,
            frequencyHz: midiToFrequency(midiNote),
          })
        }),
      ),
    ),
  )
}

const figureIndex = (
  mapping: FigureSequencePitchMapping,
  encounter: FigureSequenceEncounter,
  localEventIndex: number,
  figureCount: number,
): number | undefined => {
  const sourceIndex =
    mapping.accessMode !== 'indexed' || mapping.indexSource === 'event-index'
      ? localEventIndex
      : mapping.indexSource === 'boundary-index'
        ? encounter.boundaryIndex
        : encounter.barIndex

  let traversalIndex: number
  if (mapping.endBehavior === 'loop') {
    traversalIndex = positiveModulo(sourceIndex, figureCount)
  } else if (mapping.endBehavior === 'hold') {
    traversalIndex = Math.min(figureCount - 1, Math.max(0, sourceIndex))
  } else {
    if (sourceIndex < 0 || sourceIndex >= figureCount) return undefined
    traversalIndex = sourceIndex
  }

  return mapping.accessMode === 'lifo'
    ? figureCount - 1 - traversalIndex
    : traversalIndex
}

/**
 * Resolves every selected Encounter at once so sequence position is a pure
 * function of the stable Encounter stream. No playback cursor survives a
 * compile, seek, replay, or reinterpretation boundary.
 */
export const buildFigureSequencePitches = (
  mapping: FigureSequencePitchMapping,
  encounters: ReadonlyArray<FigureSequenceEncounter>,
  composition: Composition,
): ReadonlyArray<ReadonlyArray<ResolvedFigurePitch>> => {
  const figures = transformedFigureSequence(mapping)
  if (figures.length === 0) return Object.freeze([])

  const segmentCounts = new Map<string, number>()
  return Object.freeze(
    encounters.map((encounter) => {
      const key = resetKey(mapping, encounter, composition)
      const localEventIndex = segmentCounts.get(key) ?? 0
      segmentCounts.set(key, localEventIndex + 1)
      const index = figureIndex(
        mapping,
        encounter,
        localEventIndex,
        figures.length,
      )
      return index === undefined ? Object.freeze([]) : figures[index]
    }),
  )
}
