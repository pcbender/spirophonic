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

  /*
   * "Add grid" drew a single vertical stroke. Every other Field kind is a
   * complete instance of itself at one Boundary — one ring is a ring — but one
   * grid line is a line, and grid is the only kind whose name denotes a
   * plurality. It now starts as an actual lattice.
   */
  it('creates a grid that reads as a grid, centred on the Field', () => {
    const onChange = vi.fn()
    render(<FieldPanel composition={withoutFields()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add grid' }))

    const field = (onChange.mock.calls[0][0] as Composition).fields[0]
    const lines = field.boundaries as Array<{
      axis: 'x' | 'y'
      offset: number
      index: number
    }>

    expect(lines).toHaveLength(4)
    // Both axes, so it is a lattice rather than a set of stripes.
    expect(lines.filter((line) => line.axis === 'x')).toHaveLength(2)
    expect(lines.filter((line) => line.axis === 'y')).toHaveLength(2)
    // Centred on the Field: the old rule only ever produced offsets >= 0, so a
    // grid grew into one quadrant and away from its own centre.
    for (const axis of ['x', 'y'] as const) {
      const offsets = lines
        .filter((line) => line.axis === axis)
        .map((line) => line.offset)
        .sort((left, right) => left - right)
      expect(offsets).toEqual([-40, 40])
    }
    // Distinct indices, which newBoundaryBase does not give and the validator
    // requires.
    expect(new Set(lines.map((line) => line.index)).size).toBe(4)
  })

  it('grows a grid squarely and symmetrically as Boundaries are added', () => {
    let composition = withoutFields()
    const onChange = vi.fn((next: Composition) => {
      composition = next
    })
    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add grid' }))

    // Two more, one per axis, stepping outward rather than piling up.
    for (let added = 0; added < 2; added += 1) {
      cleanup()
      render(<FieldPanel composition={composition} onChange={onChange} />)
      fireEvent.click(
        screen.getByRole('button', { name: /^Add boundary field-grid/ }),
      )
    }

    const lines = composition.fields[0].boundaries as Array<{
      axis: 'x' | 'y'
      offset: number
    }>
    expect(lines).toHaveLength(6)
    expect(validateComposition(composition).ok).toBe(true)
    // Six lines, three per axis, and no two on an axis share an offset.
    for (const axis of ['x', 'y'] as const) {
      const offsets = lines
        .filter((line) => line.axis === axis)
        .map((line) => line.offset)
      expect(offsets).toHaveLength(3)
      expect(new Set(offsets).size).toBe(3)
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

describe('Field and Boundary names stay distinct', () => {
  /*
   * A Field was named for its kind alone, so every grid was "Grid Field". The
   * ids differ and nothing breaks in the model, but the Boundary picker in the
   * Parts panel lists a Boundary as "Field / Boundary" and the tree builds its
   * accessible names the same way: two rows reading the same thing are two
   * controls nothing can tell apart.
   */
  it('numbers a second Field of the same kind', () => {
    const onChange = vi.fn()
    let composition = withoutFields()

    for (const expected of ['Grid Field', 'Grid Field 2', 'Grid Field 3']) {
      cleanup()
      render(<FieldPanel composition={composition} onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add grid' }))
      composition = onChange.mock.calls.at(-1)?.[0] as Composition
      expect(composition.fields.at(-1)?.name).toBe(expected)
    }

    const names = composition.fields.map((field) => field.name)
    expect(new Set(names).size).toBe(names.length)
    expect(validateComposition(composition).ok).toBe(true)
  })

  it('does not reissue the name of a Boundary that is still there', () => {
    const onChange = vi.fn()
    let composition = withoutFields()

    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add rings' }))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    const field = composition.fields[0]

    cleanup()
    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(`Add boundary ${field.id}`))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.fields[0].boundaries.map((item) => item.name)).toEqual([
      'Ring 1',
      'Ring 2',
    ])

    // Remove the first, then add: counting the survivors would say "Ring 2".
    cleanup()
    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(
      screen.getByLabelText(`Remove ${composition.fields[0].boundaries[0].id}`),
    )
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    cleanup()
    render(<FieldPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(`Add boundary ${field.id}`))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    const names = composition.fields[0].boundaries.map((item) => item.name)
    expect(new Set(names).size).toBe(names.length)
    expect(validateComposition(composition).ok).toBe(true)
  })
})
