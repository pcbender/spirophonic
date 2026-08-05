import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'
import type { Composition, NotePartSpec } from './core/composition'
import { defaultComposition } from './core/defaultComposition'
import { compilePerformance } from './core/performance'
import { beatsToSeconds } from './core/transport'
import { buildCompositionScene } from './render/compositionRenderer'
import {
  exportCompositionToJson,
  parseCompositionJson,
} from './export/compositionJson'

const cloneDefault = () => structuredClone(defaultComposition) as Composition

const performanceRequestFor = (composition: Composition) => ({
  startSeconds: beatsToSeconds(
    composition.transport.loop.startBeat,
    composition.transport.tempoBpm,
  ),
  durationSeconds: beatsToSeconds(
    composition.transport.loop.lengthBeats,
    composition.transport.tempoBpm,
  ),
  sampleRateHz: 120,
})

afterEach(cleanup)

describe('MG-09 playable Composition app', () => {
  it('renders the v1 editor and canonical performance surface', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Spirophonic' })).toBeInTheDocument()
    expect(screen.getByLabelText('Composition transport')).toBeInTheDocument()
    expect(screen.getByLabelText('Composition controls')).toBeInTheDocument()
    expect(screen.getByLabelText('Wheel controls')).toBeInTheDocument()
    expect(screen.getByLabelText('Head controls')).toBeInTheDocument()
    expect(screen.getByLabelText('Fields')).toBeInTheDocument()
    expect(screen.getByLabelText('Parts')).toBeInTheDocument()
    expect(screen.getByLabelText('Instruments')).toBeInTheDocument()
    expect(screen.getByLabelText('Transport status')).toHaveTextContent('events')
  })

  it('edits Wheel rate on the running v1 Composition state', () => {
    render(<App />)
    const cycles = screen.getByLabelText('Cycles')

    fireEvent.change(cycles, { target: { value: '2' } })
    expect(cycles).toHaveValue(2)
  })

  it('Wheel rate changes both the visible state and audible event schedule at fixed tempo', () => {
    const first = cloneDefault()
    const second = cloneDefault()
    second.wheels[0].rate.cycles = 2
    const request = performanceRequestFor(first)
    const firstPerformance = compilePerformance(first, request)
    const secondPerformance = compilePerformance(second, request)
    const observation = {
      startSeconds: request.startSeconds,
      endSeconds: request.startSeconds + request.durationSeconds,
      sampleRateHz: request.sampleRateHz,
    }

    expect(second.transport.tempoBpm).toBe(first.transport.tempoBpm)
    expect(
      buildCompositionScene(second, 1, observation).traces[0].head.position,
    ).not.toEqual(
      buildCompositionScene(first, 1, observation).traces[0].head.position,
    )
    expect(secondPerformance.performedEvents.map((event) => event.timeSeconds)).not.toEqual(
      firstPerformance.performedEvents.map((event) => event.timeSeconds),
    )
  })

  it('tempo scales seconds without changing spatial Encounter order', () => {
    const first = cloneDefault()
    const second = cloneDefault()
    second.transport.tempoBpm = 90
    const firstPerformance = compilePerformance(first, performanceRequestFor(first))
    const secondPerformance = compilePerformance(second, performanceRequestFor(second))
    const spatialSignature = (composition: ReturnType<typeof compilePerformance>) =>
      composition.encounters.map((encounter) => ({
        wheelId: encounter.wheelId,
        headId: encounter.headId,
        fieldId: encounter.fieldId,
        boundaryId: encounter.boundaryId,
        direction: encounter.direction,
      }))

    expect(spatialSignature(secondPerformance)).toEqual(
      spatialSignature(firstPerformance),
    )
    expect(secondPerformance.performedEvents.map((event) => event.timeSeconds)).not.toEqual(
      firstPerformance.performedEvents.map((event) => event.timeSeconds),
    )
  })

  it('a Ring edit changes its observing Part but leaves a Spoke Part unchanged', () => {
    const before = cloneDefault()
    const basePart = before.parts[0] as NotePartSpec
    const ringPart: NotePartSpec = {
      ...structuredClone(basePart),
      id: 'part-ring',
      encounterQuery: {
        ...structuredClone(basePart.encounterQuery),
        boundaryIds: ['ring-inner'],
      },
    }
    const spokePart: NotePartSpec = {
      ...structuredClone(basePart),
      id: 'part-spoke',
      encounterQuery: {
        ...structuredClone(basePart.encounterQuery),
        boundaryIds: ['spoke-east'],
      },
    }
    before.parts = [ringPart, spokePart]
    const after = structuredClone(before) as Composition
    const ring = after.fields[0].boundaries[0]
    if (ring.kind === 'ring') ring.radius += 20
    const first = compilePerformance(before, performanceRequestFor(before))
    const second = compilePerformance(after, performanceRequestFor(after))
    const eventsFor = (performance: ReturnType<typeof compilePerformance>, partId: string) =>
      performance.performedEvents.filter((event) => event.partId === partId)

    expect(eventsFor(second, 'part-ring')).not.toEqual(eventsFor(first, 'part-ring'))
    expect(eventsFor(second, 'part-spoke')).toEqual(eventsFor(first, 'part-spoke'))
  })

  it('v1 JSON recreates the same drawing and canonical performance', () => {
    const composition = cloneDefault()
    const parsed = parseCompositionJson(exportCompositionToJson(composition))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const request = performanceRequestFor(composition)
    const observation = {
      startSeconds: request.startSeconds,
      endSeconds: request.startSeconds + request.durationSeconds,
      sampleRateHz: request.sampleRateHz,
    }
    expect(
      buildCompositionScene(parsed.composition, observation.endSeconds, observation),
    ).toEqual(
      buildCompositionScene(composition, observation.endSeconds, observation),
    )
    expect(compilePerformance(parsed.composition, request)).toEqual(
      compilePerformance(composition, request),
    )
  })
})
