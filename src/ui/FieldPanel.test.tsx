import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition, RingFieldSpec } from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import { defaultComposition } from '../core/defaultComposition'
import { FieldPanel } from './FieldPanel'

afterEach(cleanup)

const withoutFields = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.fields = []
  composition.parts = []
  return composition
}

const withRings = (): Composition => {
  const composition = withoutFields()
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
        composition={withoutFields()}
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

    fireEvent.change(screen.getByLabelText('Radius ring-1'), {
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

    fireEvent.click(screen.getByRole('button', {
        name: `Add boundary ${composition.fields[0].id}`,
      }))
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
    let composition = withoutFields()
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

describe('MG-13 Field authoring', () => {
  it('creates each new Field kind with a valid first Boundary', () => {
    const cases: Array<[string, string, string]> = [
      ['Add ellipses', 'ellipses', 'ellipse'],
      ['Add bands', 'bands', 'band'],
      ['Add grid', 'grid', 'grid'],
      ['Add spiral', 'spiral', 'spiral'],
    ]

    for (const [button, fieldKind, boundaryKind] of cases) {
      cleanup()
      const onChange = vi.fn()
      render(
        <FieldPanel composition={withoutFields()} onChange={onChange} />,
      )
      fireEvent.click(screen.getByRole('button', { name: button }))

      const next = onChange.mock.calls[0][0] as Composition
      expect(next.fields).toHaveLength(1)
      expect(next.fields[0].kind).toBe(fieldKind)
      expect(next.fields[0].boundaries[0].kind).toBe(boundaryKind)
      expect(validateComposition(next).ok).toBe(true)
    }
  })

  it('steps sibling Boundaries outward so a new one never lands on another', () => {
    const onChange = vi.fn()
    render(<FieldPanel composition={withoutFields()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add bands' }))
    let composition = onChange.mock.calls.at(-1)?.[0] as Composition

    cleanup()
    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(
      screen.getByRole('button', { name: `Add boundary ${composition.fields[0].id}` }),
    )
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    const [first, second] = composition.fields[0].boundaries
    expect(first.kind).toBe('band')
    expect(second.kind).toBe('band')
    if (first.kind !== 'band' || second.kind !== 'band') return
    expect(second.innerRadius).toBeGreaterThanOrEqual(first.outerRadius)
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('switches a Field to each motion kind and keeps it valid', () => {
    const onChange = vi.fn()
    render(<FieldPanel composition={withRings()} onChange={onChange} />)
    const fieldId = withRings().fields[0].id

    fireEvent.change(screen.getByLabelText(`Motion ${fieldId}`), {
      target: { value: 'rotating' },
    })
    let composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.fields[0].motion).toEqual({
      kind: 'rotating',
      turnsPerSecond: 0.25,
    })
    expect(validateComposition(composition).ok).toBe(true)

    cleanup()
    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(`Motion ${fieldId}`), {
      target: { value: 'wheel-attached' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.fields[0].motion).toMatchObject({
      kind: 'wheel-attached',
      followRotation: true,
    })
    // The default attachment names a Wheel that actually exists.
    expect(validateComposition(composition).ok).toBe(true)
  })
})
