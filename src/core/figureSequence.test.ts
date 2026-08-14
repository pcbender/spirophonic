import { describe, expect, it } from 'vitest'

import type {
  Composition,
  FigureSequencePitchMapping,
} from './composition'
import { defaultComposition } from './defaultComposition'
import {
  buildFigureSequencePitches,
  transformedFigureSequence,
  type FigureSequenceEncounter,
} from './figureSequence'

const composition = () => structuredClone(defaultComposition) as Composition

const mapping = (
  overrides: Partial<FigureSequencePitchMapping> = {},
): FigureSequencePitchMapping => ({
  kind: 'figure-sequence',
  accessMode: 'fifo',
  endBehavior: 'loop',
  resetOn: 'performance',
  root: 60,
  scale: 'major',
  transform: {
    kind: 'prime',
    transpose: 0,
    axis: 60,
    intervalScale: 1,
  },
  figures: [
    { kind: 'note', note: 60 },
    { kind: 'note', note: 62 },
    { kind: 'note', note: 64 },
  ],
  ...overrides,
})

const encounter = (
  index: number,
  overrides: Partial<FigureSequenceEncounter> = {},
): FigureSequenceEncounter => ({
  wheelId: 'wheel-1',
  boundaryIndex: index,
  absoluteBeat: index,
  barIndex: Math.floor(index / 4),
  ...overrides,
})

const midi = (
  result: ReturnType<typeof buildFigureSequencePitches>,
) => result.map((figure) => figure.map((pitch) => pitch.midiNote))

describe('figure-sequence pitch resolution', () => {
  it('traverses FIFO and LIFO in opposite directions and loops by default', () => {
    const events = [0, 1, 2, 3].map((index) => encounter(index))

    expect(midi(buildFigureSequencePitches(mapping(), events, composition())))
      .toEqual([[60], [62], [64], [60]])
    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ accessMode: 'lifo' }),
          events,
          composition(),
        ),
      ),
    ).toEqual([[64], [62], [60], [64]])
  })

  it('holds the traversal endpoint or becomes silent after exhaustion', () => {
    const events = [0, 1, 2, 3].map((index) => encounter(index))

    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ endBehavior: 'hold' }),
          events,
          composition(),
        ),
      ),
    ).toEqual([[60], [62], [64], [64]])
    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ accessMode: 'lifo', endBehavior: 'hold' }),
          events,
          composition(),
        ),
      ),
    ).toEqual([[64], [62], [60], [60]])
    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ endBehavior: 'silence' }),
          events,
          composition(),
        ),
      ),
    ).toEqual([[60], [62], [64], []])
  })

  it('uses deterministic Encounter metadata for indexed access', () => {
    const events = [
      encounter(0, { boundaryIndex: 2, barIndex: 1 }),
      encounter(1, { boundaryIndex: 0, barIndex: 2 }),
    ]

    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ accessMode: 'indexed', indexSource: 'boundary-index' }),
          events,
          composition(),
        ),
      ),
    ).toEqual([[64], [60]])
    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ accessMode: 'indexed', indexSource: 'bar-index' }),
          events,
          composition(),
        ),
      ),
    ).toEqual([[62], [64]])
  })

  it('restarts traversal at bar and Wheel-cycle boundaries', () => {
    const barEvents = [
      encounter(0, { barIndex: 0 }),
      encounter(1, { barIndex: 0 }),
      encounter(2, { barIndex: 1 }),
    ]
    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ resetOn: 'bar' }),
          barEvents,
          composition(),
        ),
      ),
    ).toEqual([[60], [62], [60]])

    const cycleEvents = [
      encounter(0, { absoluteBeat: 0.5 }),
      encounter(1, { absoluteBeat: 2 }),
      encounter(2, { absoluteBeat: 4.5 }),
    ]
    expect(
      midi(
        buildFigureSequencePitches(
          mapping({ resetOn: 'wheel-cycle' }),
          cycleEvents,
          composition(),
        ),
      ),
    ).toEqual([[60], [62], [60]])
  })

  it('applies retrograde, inversion, transpose, and interval scaling to the collection', () => {
    const transformed = transformedFigureSequence(
      mapping({
        transform: {
          kind: 'retrograde-inversion',
          transpose: 2,
          axis: 60,
          intervalScale: 0.5,
        },
      }),
    )

    expect(midi(transformed)).toEqual([[60], [61], [62]])
    expect(midi(transformedFigureSequence(mapping({
      transform: {
        kind: 'retrograde',
        transpose: 0,
        axis: 60,
        intervalScale: 1,
      },
    })))).toEqual([[64], [62], [60]])
  })

  it('resolves chords, scale degrees, pitch-class sets, and interval structures', () => {
    const result = transformedFigureSequence(
      mapping({
        figures: [
          { kind: 'chord', notes: [60, 64, 67] },
          { kind: 'scale-degree', degree: 2 },
          { kind: 'pitch-class-set', pitchClasses: [0, 4, 7] },
          { kind: 'interval-structure', intervals: [0, 3, 7] },
        ],
      }),
    )

    expect(midi(result)).toEqual([
      [60, 64, 67],
      [64],
      [60, 64, 67],
      [60, 63, 67],
    ])
  })

  it('is byte-stable across repeated resolution', () => {
    const spec = mapping({
      accessMode: 'indexed',
      indexSource: 'boundary-index',
      figures: [{ kind: 'note', note: 55 }, { kind: 'chord', notes: [60, 64] }],
    })
    const events = [encounter(1), encounter(0), encounter(3)]

    expect(buildFigureSequencePitches(spec, events, composition())).toEqual(
      buildFigureSequencePitches(spec, events, composition()),
    )
  })
})
