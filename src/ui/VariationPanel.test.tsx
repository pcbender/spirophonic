import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { randomVersion } from '../core/random'
import { VariationPanel } from './VariationPanel'

afterEach(cleanup)

const base = () => structuredClone(defaultComposition) as Composition
const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

describe('VariationPanel', () => {
  it('starts with no variation and says the compiler runs unvaried', () => {
    render(<VariationPanel composition={base()} onChange={vi.fn()} />)

    expect(screen.getByText(/exact unvaried path/)).toBeTruthy()
    expect(screen.queryByLabelText('Variation seed')).toBeNull()
  })

  it('enables variation with a stamped randomness version that validates', () => {
    const onChange = vi.fn()
    render(<VariationPanel composition={base()} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Enable variation' }))
    const next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(next.variation?.enabled).toBe(true)
    expect(next.variation?.version).toBe(randomVersion)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('changes the compiled result when the seed changes', () => {
    const onChange = vi.fn()
    let composition = base()
    composition.variation = {
      enabled: true,
      seed: 'alpha',
      version: randomVersion,
      performance: { enabled: true, amount: 1 },
    }
    const before = compilePerformance(composition, request)

    render(<VariationPanel composition={composition} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Variation seed'), {
      target: { value: 'beta' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(composition.variation?.seed).toBe('beta')
    expect(validateComposition(composition).ok).toBe(true)
    expect(compilePerformance(composition, request).performedEvents).not.toEqual(
      before.performedEvents,
    )
  })

  it('toggles a single layer without disturbing the others', () => {
    const onChange = vi.fn()
    const composition = base()
    composition.variation = {
      enabled: true,
      seed: 'alpha',
      version: randomVersion,
      initialConditions: { enabled: false, amount: 0.25 },
      interpretation: { enabled: false, amount: 0.25 },
      performance: { enabled: true, amount: 0.25 },
    }

    render(<VariationPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Initial conditions enabled'))
    const next = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(next.variation?.initialConditions?.enabled).toBe(true)
    expect(next.variation?.interpretation).toEqual(
      composition.variation?.interpretation,
    )
    expect(next.variation?.performance).toEqual(composition.variation?.performance)
    expect(validateComposition(next).ok).toBe(true)
  })
})
