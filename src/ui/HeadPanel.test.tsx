import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import { defaultComposition } from '../core/defaultComposition'
import { traceObservationOf } from '../core/traces'
import { HeadPanel } from './HeadPanel'

afterEach(cleanup)

const base = () => structuredClone(defaultComposition) as Composition

describe('HeadPanel Trace observation', () => {
  it('hides observation settings until observation is switched on', () => {
    render(<HeadPanel composition={base()} onChange={vi.fn()} />)

    expect(screen.getByLabelText('Observe trace head-1')).toBeTruthy()
    expect(screen.queryByLabelText('Trace retention head-1')).toBeNull()
  })

  it('enables observation with defaults that validate', () => {
    const onChange = vi.fn()
    render(<HeadPanel composition={base()} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Observe trace head-1'))
    const next = onChange.mock.calls.at(-1)?.[0] as Composition
    const observation = traceObservationOf(next.wheels[0].heads[0])

    expect(observation.enabled).toBe(true)
    expect(observation.retention).toBe('window')
    expect(observation.allowSelf).toBe(false)
    expect(validateComposition(next).ok).toBe(true)
  })

  it('edits retention, rate, and self-crossing without losing the Trace style', () => {
    const onChange = vi.fn()
    let composition = base()
    composition.wheels[0].heads[0].observation = {
      enabled: true,
      retention: 'window',
      sampleRateHz: 60,
      maxSegments: 4_000,
      allowSelf: false,
    }
    const originalTrace = structuredClone(composition.wheels[0].heads[0].trace)

    render(<HeadPanel composition={composition} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Trace retention head-1'), {
      target: { value: 'full' },
    })
    composition = onChange.mock.calls.at(-1)?.[0] as Composition
    expect(composition.wheels[0].heads[0].observation?.retention).toBe('full')

    cleanup()
    render(<HeadPanel composition={composition} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Allow self crossing head-1'))
    composition = onChange.mock.calls.at(-1)?.[0] as Composition

    expect(composition.wheels[0].heads[0].observation?.allowSelf).toBe(true)
    // Presentation is a separate concern from observation.
    expect(composition.wheels[0].heads[0].trace).toEqual(originalTrace)
    expect(validateComposition(composition).ok).toBe(true)
  })
})
