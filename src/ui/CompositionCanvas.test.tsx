import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import type { BoundaryCrossingEncounter } from '../core/encounters'
import { defaultComposition } from '../core/defaultComposition'
import type { GateModulationLane } from '../core/gateModulation'
import { CompositionCanvas } from './CompositionCanvas'

const observation = {
  startSeconds: 0,
  endSeconds: 2,
  sampleRateHz: 4,
}

const context = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '',
  font: '',
  globalAlpha: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  lineWidth: 1,
  strokeStyle: '',
}

describe('CompositionCanvas', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('draws an absolute Composition scene through the canvas adapter', () => {
    render(
      <CompositionCanvas
        composition={structuredClone(defaultComposition) as Composition}
        timeSeconds={1}
        observation={observation}
      />,
    )

    expect(
      screen.getByLabelText('Spirophonic composition preview'),
    ).toBeInTheDocument()
    expect(context.clearRect).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
    expect(context.arc).toHaveBeenCalled()
  })

  it('exposes full Trace, Head marker, and debug-ID switches', () => {
    const composition = structuredClone(defaultComposition) as Composition
    composition.fields = []
    const { container } = render(
      <CompositionCanvas
        composition={composition}
        timeSeconds={1}
        observation={observation}
        traceMode="full"
        showTraces={false}
        showHeads={false}
        showDebugIds
      />,
    )

    expect(container.querySelector('figure')).toHaveAttribute(
      'data-trace-mode',
      'full',
    )
    expect(context.stroke).not.toHaveBeenCalled()
    expect(context.arc).not.toHaveBeenCalled()
    expect(context.fillText).toHaveBeenCalledWith(
      'wheel-1/head-1',
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('redraws a direct seek from absolute time without advancing pen state', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const { container, rerender } = render(
      <CompositionCanvas
        composition={composition}
        timeSeconds={0.5}
        observation={observation}
      />,
    )
    const callsBeforeSeek = context.clearRect.mock.calls.length

    rerender(
      <CompositionCanvas
        composition={composition}
        timeSeconds={1.5}
        observation={observation}
      />,
    )

    expect(container.querySelector('figure')).toHaveAttribute(
      'data-render-time',
      '1.5',
    )
    expect(context.clearRect.mock.calls.length).toBeGreaterThan(callsBeforeSeek)
  })

  it('draws recent Encounter positions as an overlay', () => {
    const encounter = {
      position: { x: 20, y: 10 },
    } as BoundaryCrossingEncounter
    const { container } = render(
      <CompositionCanvas
        composition={structuredClone(defaultComposition) as Composition}
        timeSeconds={1}
        observation={observation}
        recentEncounters={[encounter]}
      />,
    )

    expect(container.querySelector('figure')).toHaveAttribute(
      'data-recent-encounters',
      '1',
    )
    expect(context.fillStyle).toBe('#f2c14e')
  })

  it('accepts canonical modulation lanes as renderer input', () => {
    const lane = {
      id: 'lane-1',
      noteEventId: 'note-1',
      headId: 'head-1',
      entryOnly: true,
      startSeconds: 1,
      endSeconds: 1,
      samples: [],
    } as unknown as GateModulationLane
    const { container } = render(
      <CompositionCanvas
        composition={structuredClone(defaultComposition) as Composition}
        timeSeconds={1}
        observation={observation}
        modulationLanes={[lane]}
      />,
    )

    expect(container.querySelector('figure')).toHaveAttribute(
      'data-modulation-lanes',
      '1',
    )
  })
})
