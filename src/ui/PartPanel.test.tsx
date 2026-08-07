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
