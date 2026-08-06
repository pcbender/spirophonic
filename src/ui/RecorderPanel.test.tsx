import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { RecorderPanel } from './RecorderPanel'

afterEach(cleanup)

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }
const base = () => structuredClone(defaultComposition) as Composition

const setup = (positionSeconds = 4) => {
  const composition = base()
  const performance = compilePerformance(composition, request)
  const view = render(
    <RecorderPanel
      composition={composition}
      performance={performance}
      positionSeconds={positionSeconds}
    />,
  )
  const move = (next: number) =>
    view.rerender(
      <RecorderPanel
        composition={composition}
        performance={performance}
        positionSeconds={next}
      />,
    )
  return { composition, performance, move }
}

describe('RecorderPanel', () => {
  it('starts with no Recording and Stop unavailable', () => {
    setup()

    expect(screen.getByText('No Recording yet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('captures a window and reports what it holds', () => {
    // Record across the whole window, not a zero-width slice at one position.
    const { performance, move } = setup(0)

    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    expect(screen.getByText(/Recording from/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Record' })).toHaveProperty(
      'disabled',
      true,
    )

    move(4)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(screen.getByText(/performed events/)).toBeTruthy()
    // Replay reports the captured layer, not a recompile.
    expect(
      screen.getByText(
        new RegExp(`${performance.performedEvents.length} events without`),
      ),
    ).toBeTruthy()
  })

  it('discards a Recording without touching the Composition', () => {
    const { move } = setup(0)

    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    move(4)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.queryByText('No Recording yet.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByText('No Recording yet.')).toBeTruthy()
  })
})
