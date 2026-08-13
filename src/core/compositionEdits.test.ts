import { describe, expect, it } from 'vitest'

import type { Composition } from './composition'
import { validateComposition } from './compositionValidation'
import {
  addHead,
  addInstrument,
  addWheel,
  allCompositionIds,
  duplicateHead,
  duplicateWheel,
  moveHead,
  moveWheel,
  nextCompositionId,
  removalImpact,
  removeHead,
  removeWheel,
  setHeadEnabled,
  setHeadTraceVisible,
  setWheelEnabled,
  uniqueName,
} from './compositionEdits'
import { defaultComposition } from './defaultComposition'
import { headStateAt } from './heads'

const base = () => structuredClone(defaultComposition) as Composition

const twoWheels = () => {
  const { composition } = duplicateWheel(base(), 'wheel-1')
  return composition
}

describe('id allocation', () => {
  it('never collides with an id used by any other object family', () => {
    const composition = base()
    // A Part already squats on the id a naive head counter would pick.
    composition.parts[0].id = 'head-2'

    const { composition: next, headId } = addHead(composition, 'wheel-1')

    expect(headId).not.toBe('head-2')
    expect(allCompositionIds(composition).has(headId)).toBe(false)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('honours reservations so a batch allocation stays collision-free', () => {
    const composition = base()
    const first = nextCompositionId(composition, 'head')
    const second = nextCompositionId(composition, 'head', new Set([first]))

    expect(second).not.toBe(first)
  })

  it('gives a duplicated Wheel fresh ids for the Wheel and every Head', () => {
    const composition = base()
    const { composition: next, wheelId } = duplicateWheel(composition, 'wheel-1')
    const source = next.wheels[0]
    const copy = next.wheels.find((wheel) => wheel.id === wheelId)

    expect(copy).toBeDefined()
    expect(copy?.id).not.toBe(source.id)
    expect(copy?.heads.map((head) => head.id)).not.toEqual(
      source.heads.map((head) => head.id),
    )
    expect(new Set(allCompositionIds(next)).size).toBe(
      allCompositionIds(next).size,
    )
    expect(validateComposition(next).ok).toBe(true)
  })

  it('inserts a duplicate directly after its source', () => {
    const { composition: next, wheelId } = duplicateWheel(base(), 'wheel-1')
    expect(next.wheels[1].id).toBe(wheelId)
  })
})

describe('wheel and head independence', () => {
  it('applies a rate edit to every Head on that Wheel and no other', () => {
    const composition = twoWheels()
    const [first, second] = composition.wheels
    const withExtraHead = addHead(composition, first.id).composition
    const edited: Composition = {
      ...withExtraHead,
      wheels: withExtraHead.wheels.map((wheel) =>
        wheel.id === first.id
          ? { ...wheel, rate: { cycles: 3, beats: 4 } }
          : wheel,
      ),
    }

    const movedHeads = withExtraHead.wheels[0].heads.map((head) => head.id)
    const untouchedHeads = withExtraHead.wheels[1].heads.map((head) => head.id)

    for (const headId of movedHeads) {
      const before = headStateAt(withExtraHead, headId, 0.7)
      const after = headStateAt(edited, headId, 0.7)
      expect(after.position).not.toEqual(before.position)
    }
    for (const headId of untouchedHeads) {
      const before = headStateAt(withExtraHead, headId, 0.7)
      const after = headStateAt(edited, headId, 0.7)
      expect(after.position).toEqual(before.position)
    }
    expect(second.id).not.toBe(first.id)
  })

  it('gives an added Head its Wheel motion family so the Composition stays valid', () => {
    const composition = base()
    composition.wheels[0].motion = {
      kind: 'rose',
      numerator: 5,
      denominator: 1,
    }
    composition.wheels[0].heads[0].attachment = {
      kind: 'rose',
      radiusScale: 180,
      angularOffset: 0,
    }

    const { composition: next, headId } = addHead(composition, 'wheel-1')
    const head = next.wheels[0].heads.find((item) => item.id === headId)

    expect(head?.attachment.kind).toBe('rose')
    expect(validateComposition(next).ok).toBe(true)
  })

  it('reorders without changing identity or state', () => {
    const composition = addHead(base(), 'wheel-1').composition
    const [firstId, secondId] = composition.wheels[0].heads.map((h) => h.id)
    const reordered = moveHead(composition, secondId, 0)

    expect(reordered.wheels[0].heads.map((head) => head.id)).toEqual([
      secondId,
      firstId,
    ])
    expect(headStateAt(reordered, firstId, 0.4).position).toEqual(
      headStateAt(composition, firstId, 0.4).position,
    )

    const wheels = twoWheels()
    const movedWheel = moveWheel(wheels, wheels.wheels[1].id, 0)
    expect(movedWheel.wheels[0].id).toBe(wheels.wheels[1].id)
    expect(validateComposition(movedWheel).ok).toBe(true)
  })
})

describe('removal impact', () => {
  it('blocks removing the last Wheel, the last Head, and a Part-bound Instrument', () => {
    const composition = base()

    expect(removalImpact(composition, 'wheel', 'wheel-1').blockers).toContain(
      'A Composition must keep at least one Wheel.',
    )
    expect(
      removalImpact(composition, 'head', 'head-1').blockers[0],
    ).toContain('must keep at least one Head')
    // "1 Part still plays", not "1 Part still play" — the plural was applied
    // to the noun and not the verb, and this assertion had pinned it.
    expect(
      removalImpact(composition, 'instrument', 'instrument-1').blockers.join(' '),
    ).toContain('1 Part still plays through')

    expect(() => removeWheel(composition, 'wheel-1')).toThrow(
      /at least one Wheel/,
    )
  })

  it('reports the full impact before mutating and refuses without cascade', () => {
    const composition = twoWheels()
    const target = composition.wheels[1]
    // Point the existing Part at the Wheel that is about to be removed.
    composition.parts[0].encounterQuery.wheelIds = [target.id]
    composition.parts[0].encounterQuery.headIds = [target.heads[0].id]

    const impact = removalImpact(composition, 'wheel', target.id)

    expect(impact.cascadeRemovals).toHaveLength(target.heads.length)
    expect(impact.referenceRewrites.map((item) => item.path)).toEqual([
      '$.parts[0].encounterQuery.headIds',
      '$.parts[0].encounterQuery.wheelIds',
    ])
    expect(impact.referenceRewrites[0].description).toContain('would widen')
    expect(() => removeWheel(composition, target.id)).toThrow(/cascade: true/)

    // The report did not mutate anything.
    expect(composition.wheels).toHaveLength(2)
  })

  it('prunes dangling references when the cascade is accepted', () => {
    const composition = twoWheels()
    const target = composition.wheels[1]
    composition.parts[0].encounterQuery.wheelIds = [
      composition.wheels[0].id,
      target.id,
    ]
    composition.parts[0].encounterQuery.headIds = [target.heads[0].id]

    const next = removeWheel(composition, target.id, { cascade: true })

    expect(next.wheels).toHaveLength(1)
    expect(next.parts[0].encounterQuery.wheelIds).toEqual([
      composition.wheels[0].id,
    ])
    expect(next.parts[0].encounterQuery.headIds).toEqual([])
    expect(validateComposition(next).ok).toBe(true)
  })

  it('removes an unreferenced Head without demanding a cascade', () => {
    const composition = addHead(base(), 'wheel-1').composition
    const addedId = composition.wheels[0].heads[1].id

    const next = removeHead(composition, addedId)

    expect(next.wheels[0].heads.map((head) => head.id)).not.toContain(addedId)
    expect(validateComposition(next).ok).toBe(true)
  })
})

describe('enable, mute, and visibility stay separate concerns', () => {
  it('hides a Trace without changing Head geometry or enabled state', () => {
    const composition = base()
    const hidden = setHeadTraceVisible(composition, 'head-1', false)

    expect(hidden.wheels[0].heads[0].trace.visible).toBe(false)
    expect(hidden.wheels[0].heads[0].enabled).toBe(true)
    expect(headStateAt(hidden, 'head-1', 0.9).position).toEqual(
      headStateAt(composition, 'head-1', 0.9).position,
    )
  })

  it('disables a Wheel or Head without discarding its configuration', () => {
    const composition = addHead(base(), 'wheel-1').composition
    const headId = composition.wheels[0].heads[1].id
    const disabledHead = setHeadEnabled(composition, headId, false)
    const disabledWheel = setWheelEnabled(composition, 'wheel-1', false)

    expect(disabledHead.wheels[0].heads[1]).toEqual({
      ...composition.wheels[0].heads[1],
      enabled: false,
    })
    expect(disabledWheel.wheels[0]).toEqual({
      ...composition.wheels[0],
      enabled: false,
    })
  })
})

describe('added objects keep the Composition valid', () => {
  it('validates after add, duplicate, and reorder on every family', () => {
    let composition = base()
    composition = addWheel(composition, composition.wheels[0]).composition
    composition = addHead(composition, composition.wheels[1].id).composition
    composition = duplicateHead(
      composition,
      composition.wheels[1].heads[0].id,
    ).composition
    composition = duplicateWheel(composition, composition.wheels[0].id).composition
    composition = moveWheel(composition, composition.wheels[0].id, 2)

    const result = validateComposition(composition)

    expect(result.ok).toBe(true)
    expect(composition.wheels).toHaveLength(3)
    const ids = [
      ...composition.wheels.map((wheel) => wheel.id),
      ...composition.wheels.flatMap((wheel) =>
        wheel.heads.map((head) => head.id),
      ),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('names read as a series', () => {
  /*
   * Adding copies the last object of its kind, so each new name used to be
   * derived from an already-derived one: Wheel 1 begat "Wheel 1 2" begat
   * "Wheel 1 2 2". Four Heads into a fourth Wheel the tree read
   * "Head 1 2 2 2 2 2 2 2 2".
   */
  it('numbers four rounds of Add Wheel and Add Head the way a person would', () => {
    let composition = base()

    for (let round = 0; round < 4; round += 1) {
      const added = addWheel(
        composition,
        composition.wheels[composition.wheels.length - 1],
      )
      composition = added.composition
      for (let head = 0; head < 4; head += 1) {
        composition = addHead(composition, added.wheelId).composition
      }
    }

    expect(composition.wheels.map((wheel) => wheel.name)).toEqual([
      'Wheel 1',
      'Wheel 2',
      'Wheel 3',
      'Wheel 4',
      'Wheel 5',
    ])
    // Head names are unique per Wheel, so every Wheel counts from one.
    for (const wheel of composition.wheels.slice(1)) {
      expect(wheel.heads.map((head) => head.name)).toEqual([
        'Head 1',
        'Head 2',
        'Head 3',
        'Head 4',
        'Head 5',
      ])
    }
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('keeps a name that is not a series whole, and numbers it only on collision', () => {
    let composition = base()
    composition.wheels[0].name = 'Bass'

    composition = addWheel(composition, composition.wheels[0]).composition
    expect(composition.wheels[1].name).toBe('Bass 2')

    composition = addWheel(composition, composition.wheels[1]).composition
    expect(composition.wheels[2].name).toBe('Bass 3')
  })

  it('appends duplicate-named Instruments without changing Part assignments', () => {
    const composition = base()
    const originalAssignments = composition.parts.map(
      (part) => part.instrumentId,
    )
    const template = {
      ...composition.instruments[0],
      name: 'Warm Strings',
    }

    const first = addInstrument(composition, template).composition
    const second = addInstrument(first, template).composition

    expect(second.instruments.slice(-2).map((instrument) => instrument.name)).toEqual([
      'Warm Strings',
      'Warm Strings 2',
    ])
    expect(second.parts.map((part) => part.instrumentId)).toEqual(
      originalAssignments,
    )
  })

  it('numbers a copy after the thing it copied, not inside its name', () => {
    let composition = base()

    composition = duplicateWheel(composition, 'wheel-1').composition
    expect(composition.wheels[1].name).toBe('Wheel 1 copy')

    composition = duplicateWheel(composition, 'wheel-1').composition
    expect(composition.wheels[1].name).toBe('Wheel 1 copy 2')
  })

  /*
   * The tree adds from the last Wheel, so cloning every Head compounded: four
   * Heads added to a Wheel meant the next Wheel arrived carrying five, then
   * nine, then thirteen. Copy is the button that means "all of it".
   */
  it('adds a Wheel carrying one Head however many the template has', () => {
    let composition = base()
    for (let head = 0; head < 4; head += 1) {
      composition = addHead(composition, 'wheel-1').composition
    }
    expect(composition.wheels[0].heads).toHaveLength(5)

    const added = addWheel(composition, composition.wheels[0])
    expect(added.composition.wheels[1].heads).toHaveLength(1)

    // Copy still brings the whole Wheel.
    const copied = duplicateWheel(composition, 'wheel-1')
    expect(copied.composition.wheels[1].heads).toHaveLength(5)
    expect(validateComposition(copied.composition).ok).toBe(true)
  })
})

describe('uniqueName', () => {
  it('continues a numbered series from its stem', () => {
    expect(uniqueName(['Wheel 1'], 'Wheel 1')).toBe('Wheel 2')
    expect(uniqueName(['Wheel 1', 'Wheel 2'], 'Wheel 2')).toBe('Wheel 3')
    // The stem is the name without *any* trailing numbers, so a document
    // carrying the old compounding names recovers rather than extending them.
    expect(uniqueName(['Head 1', 'Head 1 2', 'Head 1 2 2'], 'Head 1 2 2')).toBe(
      'Head 2',
    )
  })

  it('leaves an unnumbered name alone until something collides with it', () => {
    expect(uniqueName([], 'Grid Field')).toBe('Grid Field')
    expect(uniqueName(['Grid Field'], 'Grid Field')).toBe('Grid Field 2')
    expect(uniqueName(['Grid Field', 'Grid Field 2'], 'Grid Field')).toBe(
      'Grid Field 3',
    )
  })

  it('never numbers behind a bare stem that already holds first place', () => {
    // "Bass" is the first of its series, so the next is 2 and never "Bass 1".
    expect(uniqueName(['Bass'], 'Bass')).toBe('Bass 2')
    expect(uniqueName(['Bass', 'Bass 2'], 'Bass 2')).toBe('Bass 3')
  })

  it('fills a gap left by a removal rather than counting the survivors', () => {
    // The bug this rule replaces: naming by list length reissues a name as
    // soon as anything has been removed.
    expect(uniqueName(['Tuning 1', 'Tuning 3'], 'Tuning 1')).toBe('Tuning 2')
  })
})
