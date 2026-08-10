import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'

import type { Composition, SoundFontInstrumentSpec } from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import {
  defaultComposition,
  referenceComposition,
} from '../core/defaultComposition'
import { InstrumentPanel } from './InstrumentPanel'

afterEach(cleanup)

const compositionWithSoundFont = () => {
  const composition = structuredClone(defaultComposition) as Composition
  const instrument: SoundFontInstrumentSpec = {
    id: composition.instruments[0].id,
    name: 'Grand Piano',
    kind: 'soundfont',
    gain: 0.75,
    pan: -0.2,
    soundBankId: 'bank-one',
    bank: 0,
    program: 0,
    presetName: 'Grand Piano',
    percussion: false,
    reverb: 0.2,
    chorus: 0.1,
  }
  composition.instruments = [instrument]
  return composition
}

describe('InstrumentPanel SoundFont controls', () => {
  it('shows the selected preset and edits backend sends', () => {
    const composition = compositionWithSoundFont()
    let updated = composition
    render(
      <InstrumentPanel
        composition={composition}
        onChange={(next) => {
          updated = next
        }}
      />,
    )

    expect(screen.getAllByText('Grand Piano', { selector: 'strong' })).toHaveLength(2)
    expect(screen.getByText(/Bank 0 · Program 0/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Reverb instrument-1'), {
      target: { value: '0.55' },
    })
    expect(updated.instruments[0]).toMatchObject({ kind: 'soundfont', reverb: 0.55 })
  })

  it('provides explicit native synth and drum fallbacks', () => {
    const composition = compositionWithSoundFont()
    let updated = composition
    const { rerender } = render(
      <InstrumentPanel composition={composition} onChange={(next) => { updated = next }} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use native synth' }))
    expect(updated.instruments[0]).toMatchObject({
      id: 'instrument-1',
      kind: 'native-synth',
      waveform: 'triangle',
    })

    rerender(
      <InstrumentPanel composition={composition} onChange={(next) => { updated = next }} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Use native drum' }))
    expect(updated.instruments[0]).toMatchObject({
      id: 'instrument-1',
      kind: 'native-drum',
      voice: 'kick',
    })
  })
})

describe('InstrumentPanel add and remove', () => {
  const Harness = ({ initial }: { initial: Composition }) => {
    const [composition, setComposition] = useState(initial)
    return (
      <>
        <InstrumentPanel composition={composition} onChange={setComposition} />
        <output aria-label="Instrument count">
          {composition.instruments.length}
        </output>
        <output aria-label="Composition valid">
          {String(validateComposition(composition).ok)}
        </output>
      </>
    )
  }

  it('adds an Instrument by copying the last, under a distinct name', () => {
    const composition = structuredClone(defaultComposition) as Composition
    const before = composition.instruments.length
    const last = composition.instruments[before - 1]
    render(<Harness initial={composition} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Instrument' }))

    expect(screen.getByLabelText('Instrument count')).toHaveTextContent(
      String(before + 1),
    )
    // Copied, not invented: a soundfont template would otherwise produce an
    // Instrument with no bank that validates and cannot play.
    expect(screen.getByText(`${last.name} 2`, { selector: 'strong' })).toBeInTheDocument()
  })

  it('removes an Instrument no Part is using', () => {
    // The reference Composition, because the default ships exactly one
    // Instrument and the last-Instrument blocker would mask this case.
    const composition = structuredClone(referenceComposition) as Composition
    // Free the first Instrument by pointing every Part at the second.
    const keep = composition.instruments[1].id
    composition.parts = composition.parts.map((part) => ({
      ...part,
      instrumentId: keep,
    }))
    const doomed = composition.instruments[0]
    render(<Harness initial={composition} />)

    fireEvent.click(screen.getByRole('button', { name: `Remove ${doomed.name}` }))

    expect(screen.getByLabelText('Instrument count')).toHaveTextContent(
      String(composition.instruments.length - 1),
    )
    expect(
      screen.queryByText(doomed.name, { selector: 'strong' }),
    ).not.toBeInTheDocument()
  })

  it('refuses to remove an Instrument a Part still plays through, and names the Parts', () => {
    const composition = structuredClone(referenceComposition) as Composition
    const used = composition.instruments.find((instrument) =>
      composition.parts.some((part) => part.instrumentId === instrument.id),
    )!
    const user = composition.parts.find(
      (part) => part.instrumentId === used.id,
    )!
    render(<Harness initial={composition} />)

    fireEvent.click(screen.getByRole('button', { name: `Remove ${used.name}` }))

    const alert = screen.getByRole('alertdialog', {
      name: 'Confirm Instrument removal',
    })
    // Naming the Part is the difference between a refusal and a dead end.
    expect(alert).toHaveTextContent(user.name)
    expect(screen.getByLabelText('Instrument count')).toHaveTextContent(
      String(composition.instruments.length),
    )
  })

  /*
   * `instrumentId` lives on PartBase, so a Control Part carries one it never
   * uses — compilePerformance branches control Parts into a lane before pitch
   * is ever mapped. Counting them as users refused removals on the grounds
   * that a Part "plays through" an Instrument it does not play through.
   */
  it('repoints a Control Part instead of refusing, and says so', () => {
    const composition = structuredClone(referenceComposition) as Composition
    const keep = composition.instruments[1].id
    const doomed = composition.instruments[0]
    composition.parts = composition.parts.map((part) => ({
      ...part,
      instrumentId: keep,
    }))
    composition.parts.push({
      id: 'control-probe',
      name: 'Probe Control',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'control',
      encounterQuery: {
        kinds: ['conjunction'],
        wheelIds: [], headIds: [], fieldIds: [], boundaryIds: [],
        directions: [], minStrength: 0, relationIds: [],
      },
      instrumentId: doomed.id,
      // The shape Add Control actually writes.
      control: {
        name: 'pan',
        source: 'distance',
        min: -1,
        max: 1,
        sampleRateHz: 30,
        smoothingSeconds: 0.1,
      },
    } as Composition['parts'][number])

    render(<Harness initial={composition} />)
    fireEvent.click(screen.getByRole('button', { name: `Remove ${doomed.name}` }))

    // Asked, not refused — and told what the rewrite is.
    const dialog = screen.getByRole('alertdialog', {
      name: 'Confirm Instrument removal',
    })
    expect(dialog).toHaveTextContent('Probe Control')
    expect(dialog).toHaveTextContent('does not change what you hear')

    fireEvent.click(screen.getByRole('button', { name: 'Remove anyway' }))
    expect(screen.getByLabelText('Instrument count')).toHaveTextContent(
      String(composition.instruments.length - 1),
    )
    // Repointed, not left dangling: a Part naming a missing Instrument fails
    // validation.
    expect(
      screen.getByLabelText('Composition valid'),
    ).toHaveTextContent('true')
  })

  it('refuses to remove the last Instrument', () => {
    const composition = compositionWithSoundFont()
    composition.parts = []
    render(<Harness initial={composition} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove Grand Piano' }))

    expect(
      screen.getByRole('alertdialog', { name: 'Confirm Instrument removal' }),
    ).toHaveTextContent('at least one Instrument')
    expect(screen.getByLabelText('Instrument count')).toHaveTextContent('1')
  })
})
