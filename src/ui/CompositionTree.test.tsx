import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import { duplicateWheel } from '../core/compositionEdits'
import { defaultComposition } from '../core/defaultComposition'
import { CompositionTree, type TreeSelection } from './CompositionTree'

afterEach(cleanup)

const base = () => structuredClone(defaultComposition) as Composition

const twoWheels = () => duplicateWheel(base(), 'wheel-1').composition

const setup = (
  composition: Composition,
  selection: TreeSelection = { kind: 'wheel', id: 'wheel-1' },
) => {
  const onChange = vi.fn()
  const onSelect = vi.fn()
  render(
    <CompositionTree
      composition={composition}
      selection={selection}
      onSelect={onSelect}
      onChange={onChange}
    />,
  )
  return { onChange, onSelect }
}

describe('CompositionTree', () => {
  it('lists every Wheel with its Heads and the Parts separately', () => {
    const composition = twoWheels()
    setup(composition)

    for (const wheel of composition.wheels) {
      expect(screen.getByText(wheel.name)).toBeTruthy()
      for (const head of wheel.heads) {
        // Head names repeat across Wheels, so identity comes from the
        // wheel-qualified action labels rather than the bare name.
        expect(
          screen.getByRole('button', {
            name: `Remove ${wheel.name} ${head.name}`,
          }),
        ).toBeTruthy()
      }
    }
    // Parts render under their own heading with their Instrument named.
    expect(screen.getByText('Parts')).toBeTruthy()
    expect(screen.getByText(/Native Synth/)).toBeTruthy()
  })

  it('adds a Wheel and selects the new one', () => {
    const composition = base()
    const { onChange, onSelect } = setup(composition)

    fireEvent.click(screen.getByRole('button', { name: 'Add Wheel' }))

    const next = onChange.mock.calls[0][0] as Composition
    expect(next.wheels).toHaveLength(2)
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'wheel',
      id: next.wheels[1].id,
    })
    expect(validateComposition(next).ok).toBe(true)
  })

  it('adds a Head to the Wheel whose button was pressed', () => {
    const composition = twoWheels()
    const second = composition.wheels[1]
    const { onChange, onSelect } = setup(composition)

    fireEvent.click(
      screen.getByRole('button', { name: `Add Head to ${second.name}` }),
    )

    const next = onChange.mock.calls[0][0] as Composition
    expect(next.wheels[0].heads).toHaveLength(
      composition.wheels[0].heads.length,
    )
    expect(next.wheels[1].heads).toHaveLength(second.heads.length + 1)
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'head',
      id: next.wheels[1].heads.at(-1)?.id,
    })
  })

  it('separates Head enable from Trace visibility', () => {
    const composition = base()
    const { onChange } = setup(composition)
    const head = composition.wheels[0].heads[0]

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: `Wheel 1 ${head.name} trace visible`,
      }),
    )

    const hidden = onChange.mock.calls[0][0] as Composition
    expect(hidden.wheels[0].heads[0].trace.visible).toBe(false)
    expect(hidden.wheels[0].heads[0].enabled).toBe(true)

    onChange.mockClear()
    fireEvent.click(
      screen.getByRole('checkbox', { name: `Wheel 1 ${head.name} enabled` }),
    )

    const disabled = onChange.mock.calls[0][0] as Composition
    expect(disabled.wheels[0].heads[0].enabled).toBe(false)
    expect(disabled.wheels[0].heads[0].trace.visible).toBe(true)
  })

  it('toggles Part mute and solo without altering the rest of the Part', () => {
    const composition = base()
    const { onChange } = setup(composition)
    const part = composition.parts[0]

    fireEvent.click(screen.getByRole('button', { name: `Mute ${part.name}` }))
    const muted = onChange.mock.calls[0][0] as Composition
    expect(muted.parts[0]).toEqual({ ...part, mute: true })

    onChange.mockClear()
    fireEvent.click(screen.getByRole('button', { name: `Solo ${part.name}` }))
    const soloed = onChange.mock.calls[0][0] as Composition
    expect(soloed.parts[0]).toEqual({ ...part, solo: true })
  })

  it('reorders a Wheel and disables the edge controls', () => {
    const composition = twoWheels()
    const [first, second] = composition.wheels
    const { onChange } = setup(composition)

    expect(
      screen.getByRole('button', { name: `Move ${first.name} up` }),
    ).toHaveProperty('disabled', true)
    expect(
      screen.getByRole('button', { name: `Move ${second.name} down` }),
    ).toHaveProperty('disabled', true)

    fireEvent.click(
      screen.getByRole('button', { name: `Move ${second.name} up` }),
    )

    const next = onChange.mock.calls[0][0] as Composition
    expect(next.wheels.map((wheel) => wheel.id)).toEqual([second.id, first.id])
  })

  it('shows the full removal impact before mutating and only removes on confirm', () => {
    const composition = twoWheels()
    const target = composition.wheels[1]
    composition.parts[0].encounterQuery.wheelIds = [target.id]
    composition.parts[0].encounterQuery.headIds = [target.heads[0].id]
    const { onChange } = setup(composition)

    fireEvent.click(
      screen.getByRole('button', { name: `Remove ${target.name}` }),
    )

    // Nothing is committed just by asking.
    expect(onChange).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog', { name: 'Confirm removal' })
    expect(dialog.textContent).toContain(target.heads[0].name)
    expect(dialog.textContent).toContain('would widen')

    fireEvent.click(screen.getByRole('button', { name: 'Remove anyway' }))

    const next = onChange.mock.calls[0][0] as Composition
    expect(next.wheels).toHaveLength(1)
    expect(next.parts[0].encounterQuery.wheelIds).toEqual([])
    expect(validateComposition(next).ok).toBe(true)
  })

  it('cancels a removal without changing anything', () => {
    const composition = twoWheels()
    const { onChange } = setup(composition)

    fireEvent.click(
      screen.getByRole('button', {
        name: `Remove ${composition.wheels[1].name}`,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('explains a blocked removal instead of offering to proceed', () => {
    const composition = base()
    setup(composition)

    fireEvent.click(screen.getByRole('button', { name: 'Remove Wheel 1' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Confirm removal' })
    expect(dialog.textContent).toContain('at least one Wheel')
    expect(screen.queryByRole('button', { name: 'Remove anyway' })).toBeNull()
  })

  it('moves selection off an object it just removed', () => {
    const composition = twoWheels()
    const target = composition.wheels[1]
    const { onSelect } = setup(composition, { kind: 'wheel', id: target.id })

    fireEvent.click(
      screen.getByRole('button', { name: `Remove ${target.name}` }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove anyway' }))

    expect(onSelect).toHaveBeenCalledWith({
      kind: 'wheel',
      id: composition.wheels[0].id,
    })
  })
})
