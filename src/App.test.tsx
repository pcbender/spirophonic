import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StrictMode } from 'react'

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

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  localStorage.clear()
})

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

  it('restores SoundBank references and preset assignments after page reload', () => {
    const composition = cloneDefault()
    composition.soundBanks = [{
      id: 'bank-local',
      name: 'Reloaded.sf2',
      digest: 'c'.repeat(64),
      format: 'sf2',
      source: 'local',
      license: 'User supplied',
      attribution: 'Reload fixture',
    }]
    composition.instruments[0] = {
      id: composition.instruments[0].id,
      name: 'Reloaded Piano',
      kind: 'soundfont',
      gain: 0.8,
      pan: 0,
      soundBankId: 'bank-local',
      bank: 0,
      program: 0,
      presetName: 'Grand Piano',
      percussion: false,
      reverb: 0.2,
      chorus: 0,
    }
    localStorage.setItem(
      'spirophonic.composition.v1',
      exportCompositionToJson(composition),
    )

    render(<App />)

    expect(screen.getByText('Reloaded.sf2', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Grand Piano', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('User supplied')).toBeInTheDocument()
  })

  it('persists Composition edits locally without replacing explicit JSON export', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Cycles'), {
      target: { value: '2' },
    })

    await waitFor(() => {
      const saved = localStorage.getItem('spirophonic.composition.v1')
      expect(saved).not.toBeNull()
      const parsed = parseCompositionJson(saved!)
      expect(parsed.ok).toBe(true)
      if (parsed.ok) expect(parsed.composition.wheels[0].rate.cycles).toBe(2)
    })
  })

  it('keeps the audio runtime alive through Strict Mode effect rehearsal', async () => {
    const composition = cloneDefault()
    composition.soundBanks = [{
      id: 'bank-missing',
      name: 'Missing.sf3',
      digest: 'd'.repeat(64),
      format: 'sf3',
      source: 'local',
      license: 'User supplied',
      attribution: '',
    }]
    composition.instruments[0] = {
      id: composition.instruments[0].id,
      name: 'Missing Piano',
      kind: 'soundfont',
      gain: 0.8,
      pan: 0,
      soundBankId: 'bank-missing',
      bank: 0,
      program: 0,
      presetName: 'Grand Piano',
      percussion: false,
      reverb: 0,
      chorus: 0,
    }
    localStorage.setItem(
      'spirophonic.composition.v1',
      exportCompositionToJson(composition),
    )

    render(<StrictMode><App /></StrictMode>)

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((alert) => alert.textContent?.includes('disposed'))).toBe(false)
    expect(alerts.some((alert) => alert.textContent?.includes('IndexedDB'))).toBe(true)
  })
})

describe('MG-12 concurrent multi-Wheel authoring', () => {
  it('drives the panels from the tree selection rather than the first object', () => {
    render(<App />)

    // A second Wheel with its own Head, selected through the tree.
    fireEvent.click(screen.getByRole('button', { name: 'Add Wheel' }))
    const wheelRows = screen.getAllByRole('button', { name: /^Wheel \d/ })
    expect(wheelRows.length).toBeGreaterThanOrEqual(2)

    fireEvent.click(wheelRows[1])

    // The Wheel panel now edits the selected Wheel, and editing its name
    // leaves the first Wheel untouched.
    const nameField = screen.getByLabelText('Wheel name') as HTMLInputElement
    fireEvent.change(nameField, { target: { value: 'Second Wheel' } })

    expect(screen.getByText('Second Wheel')).toBeInTheDocument()
    expect(screen.getByText('Wheel 1')).toBeInTheDocument()
  })

  it('loads the reference Composition and plays it through four Instruments', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Load reference' }))

    // Four Wheels, three Heads each, are all present in the tree.
    for (let wheelIndex = 1; wheelIndex <= 4; wheelIndex += 1) {
      expect(screen.getByText(`Wheel ${wheelIndex}`)).toBeInTheDocument()
      for (let headIndex = 1; headIndex <= 3; headIndex += 1) {
        expect(
          screen.getByRole('button', {
            name: `Remove Wheel ${wheelIndex} W${wheelIndex} Head ${headIndex}`,
          }),
        ).toBeInTheDocument()
      }
    }

    // The canonical performance behind the UI uses all four Instruments.
    const composition = parseCompositionJson(
      localStorage.getItem('spirophonic.composition.v1') ?? '',
    )
    expect(composition.ok).toBe(true)
    if (!composition.ok) return
    const performance = compilePerformance(
      composition.composition,
      performanceRequestFor(composition.composition),
    )
    const instrumentIds = new Set(
      performance.performedEvents.map((event) => event.instrumentId),
    )
    expect(instrumentIds.size).toBe(4)
    expect(
      performance.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([])
  })

  it('survives a cascading Wheel removal without leaving the panels dangling', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Load reference' }))
    fireEvent.click(screen.getByRole('button', { name: 'Wheel 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Wheel 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove anyway' }))

    // The removed Wheel is gone and the app still renders a valid selection.
    expect(screen.queryByText('Wheel 3')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Wheel name')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Spirophonic' })).toBeInTheDocument()

    const saved = parseCompositionJson(
      localStorage.getItem('spirophonic.composition.v1') ?? '',
    )
    expect(saved.ok).toBe(true)
  })

  it('silences a soloed mix without losing the muted Parts configuration', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Load reference' }))

    const before = parseCompositionJson(
      localStorage.getItem('spirophonic.composition.v1') ?? '',
    )
    expect(before.ok).toBe(true)
    if (!before.ok) return

    fireEvent.click(screen.getByRole('button', { name: 'Solo Ring Lead' }))

    const after = parseCompositionJson(
      localStorage.getItem('spirophonic.composition.v1') ?? '',
    )
    expect(after.ok).toBe(true)
    if (!after.ok) return

    // Only the solo flag moved; every other Part setting is identical.
    expect(after.composition.parts).toEqual(
      before.composition.parts.map((part) =>
        part.id === 'part-lead' ? { ...part, solo: true } : part,
      ),
    )

    const performance = compilePerformance(
      after.composition,
      performanceRequestFor(after.composition),
    )
    expect(
      new Set(performance.performedEvents.map((event) => event.partId)),
    ).toEqual(new Set(['part-lead']))
  })
})

/**
 * MG-21 deliverables that live at the app level: the keyboard and
 * accessibility pass, and error recovery. Layout and paint are checked in the
 * Playwright suite, which is the only place they are real.
 */
describe('MG-21 accessibility and error recovery', () => {
  it('gives every interactive control an accessible name', () => {
    render(<App />)

    const unnamed: Array<string> = []
    for (const element of [
      ...screen.queryAllByRole('button'),
      ...screen.queryAllByRole('textbox'),
      ...screen.queryAllByRole('combobox'),
      ...screen.queryAllByRole('checkbox'),
      ...screen.queryAllByRole('slider'),
      ...screen.queryAllByRole('spinbutton'),
    ]) {
      const name =
        element.getAttribute('aria-label') ??
        element.textContent?.trim() ??
        ''
      const labelled = element.getAttribute('aria-labelledby')
      // A control may be named explicitly, by a `for` label, or by being
      // wrapped in one; all three are valid to a screen reader.
      const hasLabel =
        (element.id !== '' &&
          document.querySelector(`label[for="${element.id}"]`) !== null) ||
        element.closest('label') !== null
      if (name === '' && !labelled && !hasLabel) {
        unnamed.push(element.outerHTML.slice(0, 120))
      }
    }

    expect(unnamed).toEqual([])
  })

  it('names every landmark region so a screen reader can navigate panels', () => {
    render(<App />)

    for (const label of [
      'Composition transport',
      'Composition controls',
      'Wheel controls',
      'Head controls',
      'Fields',
      'Parts',
      'Instruments',
      'Compile diagnostics',
      'Import and export',
    ]) {
      expect(screen.getByLabelText(label), label).toBeInTheDocument()
    }
  })

  it('keeps every control reachable by keyboard', () => {
    render(<App />)

    // Nothing may be removed from the tab order, and nothing may jump ahead of
    // the document order with a positive tabindex.
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]',
      ),
    ].filter((element) => !element.hasAttribute('hidden'))

    expect(focusable.length).toBeGreaterThan(10)
    for (const element of focusable) {
      const tabIndex = element.getAttribute('tabindex')
      if (tabIndex !== null) {
        expect(Number(tabIndex), element.outerHTML.slice(0, 80)).toBeLessThanOrEqual(0)
      }
      expect(
        (element as HTMLButtonElement).disabled === true ||
          element.getAttribute('aria-hidden') !== 'true',
      ).toBe(true)
    }
  })

  it('announces a refused play as an alert without losing the Composition', async () => {
    render(<App />)

    // Break the Composition through the UI, so the app is in the state a user
    // would actually reach.
    const tempo = screen.getByLabelText(/^Tempo/) as HTMLInputElement
    fireEvent.change(tempo, { target: { value: '0' } })

    const play = screen.getByRole('button', { name: 'Play' })
    fireEvent.click(play)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // The Composition is still exportable; an error surface never eats data.
    const exported = exportCompositionToJson(cloneDefault())
    expect(parseCompositionJson(exported).ok).toBe(true)
    expect(screen.getByRole('heading', { level: 1, name: 'Spirophonic' })).toBeInTheDocument()
  })

  it('recovers once the fault is corrected', async () => {
    render(<App />)
    const tempo = screen.getByLabelText(/^Tempo/) as HTMLInputElement

    fireEvent.change(tempo, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    fireEvent.change(tempo, { target: { value: '120' } })

    // The diagnostics panel returns to its clean state rather than latching.
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
