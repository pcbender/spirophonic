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
