import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Composition, SoundFontInstrumentSpec } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
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
