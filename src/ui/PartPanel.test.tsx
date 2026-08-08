import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import { defaultComposition } from '../core/defaultComposition'
import { PartPanel } from './PartPanel'

afterEach(cleanup)

/** The default Composition with a second Head, so relations can form pairs. */
const base = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.wheels[0].heads.push({
    ...structuredClone(composition.wheels[0].heads[0]),
    id: 'head-2',
    name: 'Head 2',
    phaseOffset: 0.5,
  })
  return composition
}


describe('MG-14 relation and control authoring', () => {
  it('adds a Relation that validates and can be retuned', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Relation' }))
    let composition = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(composition.relations).toHaveLength(1)
    expect(validateComposition(composition).ok).toBe(true)

    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    const id = composition.relations![0].id
    fireEvent.change(screen.getByLabelText(`Relation kind ${id}`), {
      target: { value: 'opposition' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.relations![0].kind).toBe('opposition')

    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(`Hysteresis ${id}`), {
      target: { value: '25' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.relations![0].hysteresis).toBe(25)
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('adds a Control Part bound to a Relation without touching note Parts', () => {
    const onChange = vi.fn()
    const start = base()
    render(<PartPanel composition={start} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Relation' }))
    let composition = onChange.mock.calls.at(-1)?.[0] as Composition
    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Control' }))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    const control = composition.parts.find((part) => part.kind === 'control')
    expect(control).toBeDefined()
    expect(control?.encounterQuery.relationIds).toEqual([
      composition.relations![0].id,
    ])
    // The existing note Parts are untouched.
    expect(composition.parts.filter((part) => part.kind === 'note')).toEqual(
      start.parts.filter((part) => part.kind === 'note'),
    )
    expect(validateComposition(composition).ok).toBe(true)

    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    fireEvent.change(
      screen.getByLabelText(`Control source ${control!.id}`),
      { target: { value: 'approach-rate' } },
    )
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    const updated = composition.parts.find((part) => part.kind === 'control')
    expect(updated?.kind === 'control' && updated.control.source).toBe(
      'approach-rate',
    )
  })
})

describe('MG-16 tuning authoring', () => {
  it('adds a tuning context that validates and can switch system', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Tuning' }))
    let composition = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(composition.tuningContexts).toHaveLength(1)
    expect(composition.tuningContexts![0].system.kind).toBe('equal-temperament')
    expect(validateComposition(composition).ok).toBe(true)

    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    const id = composition.tuningContexts![0].id
    fireEvent.change(screen.getByLabelText(`Tuning system ${id}`), {
      target: { value: 'rational' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(composition.tuningContexts![0].system).toEqual({
      kind: 'rational',
      maxDenominator: 64,
    })
    expect(validateComposition(composition).ok).toBe(true)
  })

  /*
   * Until this existed, Add Tuning built a context nothing could reach:
   * `tuningContextId` was in the Composition format, the validator, and the
   * compiler, and in no UI file at all. Every Part fell back to the default
   * context silently, so adding a tuning had no audible effect whatsoever.
   */
  it('points a Part at a tuning context, and back to the default', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.tuningContexts = [
      {
        id: 'tuning-just',
        name: 'Just',
        rootFrequencyHz: 432,
        system: { kind: 'rational', maxDenominator: 64 },
        octaveFold: true,
      },
    ]
    const part = composition.parts[0]
    render(<PartPanel composition={composition} onChange={onChange} />)

    // The control lives on the Tuned ratio branch, because that is the only
    // mapping that reads a tuning context.
    fireEvent.change(screen.getByLabelText(`Pitch mapping ${part.id}`), {
      target: { value: 'tuned-ratio' },
    })
    let next = onChange.mock.calls.at(-1)?.[0] as Composition

    cleanup()
    render(<PartPanel composition={next} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(`Tuning context ${part.id}`), {
      target: { value: 'tuning-just' },
    })
    next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(
      next.parts.find((item) => item.id === part.id),
    ).toMatchObject({ tuningContextId: 'tuning-just' })
    expect(validateComposition(next).ok).toBe(true)

    // Back to Default must clear the field rather than store an empty string,
    // which would fail validation as an unknown id.
    cleanup()
    render(<PartPanel composition={next} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(`Tuning context ${part.id}`), {
      target: { value: '' },
    })
    const cleared = onChange.mock.calls.at(-1)?.[0] as Composition

    const clearedPart = cleared.parts.find((item) => item.id === part.id)!
    expect(
      (clearedPart as { tuningContextId?: string }).tuningContextId,
    ).toBeUndefined()
    expect(validateComposition(cleared).ok).toBe(true)
  })

  /*
   * Every tuning after the first was minted as `tuning-1`: the panel's id
   * allocator knew about Parts and Relations and not about tuning contexts.
   * Duplicate ids fail validation, and an invalid Composition compiles to an
   * empty performance — so a second Add Tuning silenced the whole piece.
   */
  it('gives every added tuning context its own id', () => {
    const onChange = vi.fn()
    let composition = base()

    for (let count = 1; count <= 4; count += 1) {
      cleanup()
      render(<PartPanel composition={composition} onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add Tuning' }))
      composition = onChange.mock.calls.at(-1)?.[0] as Composition

      const ids = composition.tuningContexts!.map((tuning) => tuning.id)
      expect(new Set(ids).size).toBe(count)
      expect(validateComposition(composition).ok).toBe(true)
    }
  })

  /*
   * Names were minted by counting the list, so removing one and adding another
   * reissued a name that was still in use. An id keeps the objects distinct,
   * but the accessible names the UI builds are composed from names, so two
   * rows reading "Tuning 2" are two controls nothing can tell apart.
   */
  it('does not reissue the name of a tuning that is still there', () => {
    const onChange = vi.fn()
    let composition = base()

    for (let count = 0; count < 3; count += 1) {
      cleanup()
      render(<PartPanel composition={composition} onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add Tuning' }))
      composition = onChange.mock.calls.at(-1)?.[0] as Composition
    }
    expect(composition.tuningContexts!.map((item) => item.name)).toEqual([
      'Tuning 1',
      'Tuning 2',
      'Tuning 3',
    ])

    // Drop the middle one and add another: counting would call it "Tuning 3".
    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: `Remove ${composition.tuningContexts![1].id}`,
      }),
    )
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Tuning' }))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    const names = composition.tuningContexts!.map((item) => item.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(['Tuning 1', 'Tuning 3', 'Tuning 2'])
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('renames a tuning context so several can be told apart', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.tuningContexts = [
      {
        id: 'tuning-1',
        name: 'Tuning 1',
        rootFrequencyHz: 432,
        system: { kind: 'rational', maxDenominator: 64 },
        octaveFold: true,
      },
    ]
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Tuning name tuning-1'), {
      target: { value: 'Just, 432' },
    })
    const next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(next.tuningContexts![0].name).toBe('Just, 432')
    expect(validateComposition(next).ok).toBe(true)
  })

  /*
   * Removing a tuning left `tuningContextId` pointing at nothing, which is a
   * validation error, which is silence. Remove has to take the references with
   * it, the way removing an Instrument does.
   */
  it('frees the Parts that used a tuning context when it is removed', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.tuningContexts = [
      {
        id: 'tuning-just',
        name: 'Just',
        rootFrequencyHz: 432,
        system: { kind: 'rational', maxDenominator: 64 },
        octaveFold: true,
      },
    ]
    const part = composition.parts[0]
    if (part.kind === 'note') {
      part.pitch = { kind: 'tuned-ratio', ratio: { kind: 'explicit', numerator: 3, denominator: 2 } }
      part.tuningContextId = 'tuning-just'
    }
    expect(validateComposition(composition).ok).toBe(true)

    render(<PartPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove tuning-just' }))
    const next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(next.tuningContexts).toHaveLength(0)
    expect(
      (next.parts[0] as { tuningContextId?: string }).tuningContextId,
    ).toBeUndefined()
    expect(validateComposition(next).ok).toBe(true)
  })

  it('says whether a tuning context is reaching any Part', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.tuningContexts = [
      {
        id: 'tuning-just',
        name: 'Just',
        rootFrequencyHz: 432,
        system: { kind: 'rational', maxDenominator: 64 },
        octaveFold: true,
      },
    ]
    render(<PartPanel composition={composition} onChange={onChange} />)
    expect(screen.getByText(/Used by no Part/)).toBeTruthy()

    const part = composition.parts[0]
    if (part.kind === 'note') part.tuningContextId = 'tuning-just'
    cleanup()
    render(<PartPanel composition={composition} onChange={onChange} />)
    expect(screen.getByText(`Used by ${part.name}.`)).toBeTruthy()
  })
})

describe('Part targeting', () => {
  /** Two Wheels, two Heads each, so a filter has something to choose between. */
  const twoWheels = (): Composition => {
    const composition = base()
    const second = structuredClone(composition.wheels[0])
    second.id = 'wheel-2'
    second.name = 'Wheel 2'
    second.heads = second.heads.map((head, index) => ({
      ...head,
      id: `head-2-${index + 1}`,
      name: `W2 Head ${index + 1}`,
    }))
    composition.wheels.push(second)
    return composition
  }

  it('adds a Part that listens to every Wheel, not only the first', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={twoWheels()} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Part' }))
    const composition = onChange.mock.calls.at(-1)?.[0] as Composition
    const added = composition.parts.at(-1)

    // Empty is the query language's "any", so a new Part hears the whole
    // Composition rather than being silently pinned to Wheel 1.
    expect(added?.encounterQuery.wheelIds).toEqual([])
    expect(added?.encounterQuery.headIds).toEqual([])
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('retargets an existing Part onto a chosen Wheel', () => {
    const onChange = vi.fn()
    const composition = twoWheels()
    render(<PartPanel composition={composition} onChange={onChange} />)

    const partId = composition.parts[0].id
    fireEvent.click(screen.getByLabelText(`Wheel 2 for ${partId}`))

    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(next.parts[0].encounterQuery.wheelIds).toContain('wheel-2')
    expect(validateComposition(next).ok).toBe(true)
  })

  it('keeps a multi-Wheel filter intact when one more Wheel is added', () => {
    const onChange = vi.fn()
    const composition = twoWheels()
    composition.parts[0].encounterQuery.wheelIds = ['wheel-1', 'wheel-2']
    const { rerender } = render(
      <PartPanel composition={composition} onChange={onChange} />,
    )
    const partId = composition.parts[0].id

    // Both boxes read as checked, which a single-choice control could not show.
    expect(
      (screen.getByLabelText(`Wheel 1 for ${partId}`) as HTMLInputElement)
        .checked,
    ).toBe(true)
    expect(
      (screen.getByLabelText(`Wheel 2 for ${partId}`) as HTMLInputElement)
        .checked,
    ).toBe(true)

    fireEvent.click(screen.getByLabelText(`Wheel 1 for ${partId}`))
    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(next.parts[0].encounterQuery.wheelIds).toEqual(['wheel-2'])
    rerender(<PartPanel composition={next} onChange={onChange} />)
  })

  it('drops Head filters belonging to a Wheel it stops listening to', () => {
    const onChange = vi.fn()
    const composition = twoWheels()
    const partId = composition.parts[0].id
    composition.parts[0].encounterQuery.wheelIds = ['wheel-1', 'wheel-2']
    composition.parts[0].encounterQuery.headIds = ['head-1', 'head-2-1']
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText(`Wheel 2 for ${partId}`))

    // head-2-1 lives on the Wheel just removed; keeping it would leave a
    // filter that can never match.
    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(next.parts[0].encounterQuery.wheelIds).toEqual(['wheel-1'])
    expect(next.parts[0].encounterQuery.headIds).toEqual(['head-1'])
    expect(validateComposition(next).ok).toBe(true)
  })

  it('offers only the Heads on the Wheels a Part listens to', () => {
    const onChange = vi.fn()
    const composition = twoWheels()
    const partId = composition.parts[0].id
    composition.parts[0].encounterQuery.wheelIds = ['wheel-2']
    render(<PartPanel composition={composition} onChange={onChange} />)

    expect(screen.getByLabelText(`Wheel 2 W2 Head 1 for ${partId}`)).toBeTruthy()
    expect(screen.queryByLabelText(`Wheel 1 Head 1 for ${partId}`)).toBeNull()
  })
})

describe('pitch mappings', () => {
  const kinds = [
    'fixed-midi',
    'fixed-frequency',
    'boundary-degree',
    'spatial',
    'contour',
    'melodic-contour',
    'ratio',
    'tuned-ratio',
  ] as const

  it('offers every pitch mapping the format defines', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    const options = Array.from(
      (screen.getByLabelText(/^Pitch mapping/) as HTMLSelectElement).options,
    ).map((option) => option.value)
    expect(new Set(options)).toEqual(new Set(kinds))
  })

  /*
   * The root was reported as missing, and it was two different problems. On
   * boundary-degree, spatial, and contour it existed but rendered as a bare
   * MIDI number, so "48" never read as a root note. On melodic-contour it was
   * genuinely absent: the compiler pinned degree 0 to middle C.
   */
  it('names the note a root number stands for', () => {
    const onChange = vi.fn()
    const composition = base()
    const part = composition.parts[0]
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(`Pitch mapping ${part.id}`), {
      target: { value: 'boundary-degree' },
    })
    const next = onChange.mock.calls.at(-1)?.[0] as Composition

    cleanup()
    render(<PartPanel composition={next} onChange={onChange} />)
    const root = screen.getByLabelText(`Root ${part.id}`)
    expect(root).toHaveValue(48)
    // The label carries the name, and tracks the number.
    expect(root.closest('label')).toHaveTextContent('Root (C3)')

    fireEvent.change(root, { target: { value: '50' } })
    const moved = onChange.mock.calls.at(-1)?.[0] as Composition
    cleanup()
    render(<PartPanel composition={moved} onChange={onChange} />)
    expect(
      screen.getByLabelText(`Root ${part.id}`).closest('label'),
    ).toHaveTextContent('Root (D3)')
  })

  it('gives melodic-contour a root, defaulting to the middle C it was pinned to', () => {
    const onChange = vi.fn()
    const composition = base()
    const part = composition.parts[0]
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(`Pitch mapping ${part.id}`), {
      target: { value: 'melodic-contour' },
    })
    let next = onChange.mock.calls.at(-1)?.[0] as Composition

    cleanup()
    render(<PartPanel composition={next} onChange={onChange} />)
    // Unset reads as middle C, which is what the compiler used to hard-code.
    expect(
      screen.getByLabelText(`Root ${part.id}`).closest('label'),
    ).toHaveTextContent('Root (C4)')

    fireEvent.change(screen.getByLabelText(`Root ${part.id}`), {
      target: { value: '62' },
    })
    next = onChange.mock.calls.at(-1)?.[0] as Composition

    const pitch = (next.parts[0] as { pitch: { root?: number } }).pitch
    expect(pitch.root).toBe(62)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('leaves root optional and requires an anchor', () => {
    const melodic = (extra: Record<string, unknown>) => {
      const composition = base()
      composition.parts[0] = {
        ...composition.parts[0],
        kind: 'note',
        pitch: {
          kind: 'melodic-contour',
          source: 'radius',
          scale: 'dorian',
          contour: {
            maxStep: 2,
            directionBias: 0.6,
            lowDegree: 0,
            highDegree: 12,
            startDegree: 4,
          },
          ...extra,
        },
      } as Composition['parts'][number]
      return composition
    }

    // `root` may be omitted; absent means middle C.
    expect(validateComposition(melodic({ anchor: 'bar' })).ok).toBe(true)
    // `anchor` may not. It decides whether a periodic Wheel produces a
    // repeating line, and there is no default that is right for both answers.
    expect(validateComposition(melodic({})).ok).toBe(false)
  })

  it.each(kinds)('switches to %s and stays valid', (kind) => {
    const onChange = vi.fn()
    const composition = base()
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/^Pitch mapping/), {
      target: { value: kind },
    })

    // Switching cannot carry parameters across, so each kind must arrive
    // complete rather than half-filled and rejected on the next import.
    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    const part = next.parts[0]
    expect(part.kind === 'note' && part.pitch.kind).toBe(kind)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('edits the parameters belonging to the selected mapping', () => {
    const onChange = vi.fn()
    let composition = base()
    const rerenderWith = (next: Composition) => {
      composition = next
      cleanup()
      render(<PartPanel composition={composition} onChange={onChange} />)
    }
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/^Pitch mapping/), {
      target: { value: 'melodic-contour' },
    })
    rerenderWith(onChange.mock.calls.at(-1)?.[0] as Composition)

    // A melodic line is the deepest of the mappings: its own source, scale, and
    // five contour bounds, none of which any other kind owns.
    fireEvent.change(screen.getByLabelText(/^Max step/), {
      target: { value: '5' },
    })
    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    const part = next.parts[0]
    expect(
      part.kind === 'note' &&
        part.pitch.kind === 'melodic-contour' &&
        part.pitch.contour.maxStep,
    ).toBe(5)
    expect(validateComposition(next).ok).toBe(true)
  })
})

describe('note shaping', () => {
  const editedPart = (onChange: ReturnType<typeof vi.fn>) => {
    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    const part = next.parts[0]
    return { next, part: part.kind === 'note' ? part : null }
  }

  it('switches velocity to a constant and back, staying valid', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/^Velocity part/), {
      target: { value: 'constant' },
    })
    const { next, part } = editedPart(onChange)
    expect(part?.velocity.kind).toBe('constant')
    expect(validateComposition(next).ok).toBe(true)
  })

  it('edits the strength curve that shapes velocity', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/^Velocity gamma/), {
      target: { value: '2' },
    })
    const { next, part } = editedPart(onChange)
    expect(
      part?.velocity.kind === 'encounter-strength' && part.velocity.gamma,
    ).toBe(2)
    expect(validateComposition(next).ok).toBe(true)
  })

  it.each(['fixed', 'until-next', 'inside-band'] as const)(
    'switches duration to %s and stays valid',
    (kind) => {
      const onChange = vi.fn()
      render(<PartPanel composition={base()} onChange={onChange} />)

      fireEvent.change(screen.getByLabelText(/^Duration kind/), {
        target: { value: kind },
      })
      const { next, part } = editedPart(onChange)
      expect(part?.duration.kind).toBe(kind)
      expect(validateComposition(next).ok).toBe(true)
    },
  )

  it('edits quantize strength, which had no control at all', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/^Grid strength/), {
      target: { value: '0' },
    })
    const { next, part } = editedPart(onChange)
    expect(part?.quantize?.strength).toBe(0)
    // Grid spacing must survive an edit to the pull, and vice versa.
    expect(part?.quantize?.gridBeats).toBe(0.25)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('filters weak Encounters by minimum strength', () => {
    const onChange = vi.fn()
    render(<PartPanel composition={base()} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/^Minimum strength/), {
      target: { value: '0.5' },
    })
    const { next, part } = editedPart(onChange)
    expect(part?.encounterQuery.minStrength).toBe(0.5)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('names a specific Relation once a Relation kind is accepted', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.relations = [
      {
        id: 'relation-1',
        name: 'Relation 1',
        enabled: true,
        kind: 'conjunction',
        headIds: [],
        threshold: 40,
        hysteresis: 10,
        minSeparationSeconds: 0.1,
      },
    ]
    const part = composition.parts[0]
    if (part.kind === 'note') part.encounterQuery.kinds = ['conjunction']
    render(<PartPanel composition={composition} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText(`Relation 1 for ${part.id}`))
    const { next, part: edited } = editedPart(onChange)
    expect(edited?.encounterQuery.relationIds).toEqual(['relation-1'])
    expect(validateComposition(next).ok).toBe(true)
  })

  it('hides the Relation filter when no Relation kind is accepted', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.relations = [
      {
        id: 'relation-1',
        name: 'Relation 1',
        enabled: true,
        kind: 'conjunction',
        headIds: [],
        threshold: 40,
        hysteresis: 10,
        minSeparationSeconds: 0.1,
      },
    ]
    render(<PartPanel composition={composition} onChange={onChange} />)

    // The Part accepts boundary crossings only, so naming a Relation would be
    // offering a filter that cannot apply.
    const partId = composition.parts[0].id
    expect(screen.queryByLabelText(`Relation 1 for ${partId}`)).toBeNull()
  })
})
