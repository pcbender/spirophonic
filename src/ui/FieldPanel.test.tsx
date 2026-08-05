import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition, RingFieldSpec } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { FieldPanel } from './FieldPanel'

afterEach(cleanup)

const withRings = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  const field: RingFieldSpec = {
    id: 'rings-1',
    name: 'Rings',
    enabled: true,
    kind: 'rings',
    center: { x: 0, y: 0 },
    boundaries: [
      {
        id: 'ring-1',
        name: 'Inner',
        enabled: true,
        index: 0,
        kind: 'ring',
        radius: 40,
      },
      {
        id: 'ring-2',
        name: 'Outer',
        enabled: true,
        index: 1,
        kind: 'ring',
        radius: 80,
      },
    ],
  }
  composition.fields = [field]
  return composition
}

describe('FieldPanel', () => {
  it('adds a valid ring Field with explicit stable IDs', () => {
    const onChange = vi.fn()

    render(
      <FieldPanel
        composition={structuredClone(defaultComposition) as Composition}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add rings' }))

    const next = onChange.mock.calls[0][0] as Composition
    expect(next.fields).toMatchObject([
      {
        id: 'field-rings-1',
        kind: 'rings',
        boundaries: [
          {
            id: 'field-rings-1-boundary-1',
            kind: 'ring',
            radius: 50,
          },
        ],
      },
    ])
  })

  it('edits and enables a Boundary without changing sibling IDs', () => {
    const composition = withRings()
    const onChange = vi.fn()
    const { rerender } = render(
      <FieldPanel composition={composition} onChange={onChange} />,
    )

    fireEvent.change(screen.getByLabelText('Value ring-1'), {
      target: { value: '55' },
    })
    let next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(next.fields[0].boundaries.map((item) => item.id)).toEqual([
      'ring-1',
      'ring-2',
    ])
    expect(
      next.fields[0].boundaries.find((item) => item.id === 'ring-1'),
    ).toMatchObject({ radius: 55 })

    rerender(<FieldPanel composition={next} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Enable ring-2'))
    next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(next.fields[0].boundaries[1].enabled).toBe(false)
    expect(next.fields[0].boundaries[1].id).toBe('ring-2')
  })

  it('adds, reorders, and removes Boundaries while preserving identities', () => {
    const onChange = vi.fn()
    let composition = withRings()
    const { rerender } = render(
      <FieldPanel composition={composition} onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Boundary' }))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    const addedId = composition.fields[0].boundaries[2].id

    rerender(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(`Move ${addedId} up`))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.fields[0].boundaries.map((item) => item.id)).toEqual([
      'ring-1',
      addedId,
      'ring-2',
    ])

    rerender(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Remove ring-1'))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.fields[0].boundaries.map((item) => item.id)).toEqual([
      addedId,
      'ring-2',
    ])
  })

  it('adds and edits an oriented spoke Field', () => {
    const onChange = vi.fn()
    let composition = structuredClone(defaultComposition) as Composition
    const { rerender } = render(
      <FieldPanel composition={composition} onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add spokes' }))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    rerender(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Rotation field-spokes-1'), {
      target: { value: '1.57' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(composition.fields[0]).toMatchObject({
      id: 'field-spokes-1',
      kind: 'spokes',
      rotation: 1.57,
      boundaries: [{ id: 'field-spokes-1-boundary-1', kind: 'spoke' }],
    })
  })
})
