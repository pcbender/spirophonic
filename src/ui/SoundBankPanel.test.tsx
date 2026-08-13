import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import type { Composition, SoundBankReference } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import type { SoundFontPreset } from '../audio/soundfontEngine'
import { SoundBankPanel } from './SoundBankPanel'
import { useSoundBankViews } from './useSoundBankViews'

afterEach(cleanup)

const digest = 'b'.repeat(64)
const presets: Array<SoundFontPreset> = [
  { name: 'Grand Piano', bankMSB: 0, bankLSB: 0, program: 0, isDrum: false },
  { name: 'Warm Strings', bankMSB: 0, bankLSB: 0, program: 48, isDrum: false },
  { name: 'Standard Kit', bankMSB: 120, bankLSB: 0, program: 0, isDrum: true },
]

const reference: SoundBankReference = {
  id: 'bank-studio',
  name: 'Studio.sf2',
  digest,
  format: 'sf2',
  source: 'local',
  license: 'CC0 test bank',
  attribution: 'Example author',
}

const withBank = () => {
  const composition = structuredClone(defaultComposition) as Composition
  // Only this bank, so the bundled reference the default ships with does not
  // appear as a second card in every assertion.
  composition.soundBanks = [reference]
  return composition
}

type HarnessProps = {
  initial?: Composition
  inspectBank: (
    reference: SoundBankReference,
  ) => Promise<ReadonlyArray<SoundFontPreset>>
  audition?: (
    reference: SoundBankReference,
    preset: SoundFontPreset,
    note: number,
    oneShot?: boolean,
  ) => Promise<void>
  onOpenSettings?: () => void
}

/**
 * Mounts the panel against the real shared-views hook rather than a stubbed
 * map, because the split moved that state out of the panel and a stub would
 * stop testing the seam it now depends on.
 */
function Harness({
  initial,
  inspectBank,
  audition = vi.fn(async () => undefined),
  onOpenSettings = vi.fn(),
}: HarnessProps) {
  const [composition, setComposition] = useState(initial ?? withBank)
  const banks = useSoundBankViews({ composition, inspectBank })
  return (
    <>
      <SoundBankPanel
        composition={composition}
        onChange={setComposition}
        banks={banks}
        audition={audition}
        onOpenSettings={onOpenSettings}
      />
      <output aria-label="Composition state">{JSON.stringify(composition)}</output>
    </>
  )
}

describe('SoundBankPanel', () => {
  const currentComposition = () =>
    JSON.parse(screen.getByLabelText('Composition state').textContent ?? '{}') as Composition

  it('browses, previews, and appends uniquely named Instruments', async () => {
    const audition = vi.fn(async () => undefined)
    render(<Harness inspectBank={vi.fn(async () => presets)} audition={audition} />)

    const initial = currentComposition()
    const initialPartAssignments = initial.parts.map((part) => part.instrumentId)
    const initialInstrumentIds = initial.instruments.map((instrument) => instrument.id)

    expect(await screen.findByText('ready')).toBeInTheDocument()
    expect(screen.getByLabelText('Preset bank-studio')).toHaveValue('0')
    expect(
      screen.getByLabelText('Preset bank-studio').querySelectorAll('option'),
    ).toHaveLength(2)
    expect(screen.queryByRole('option', { name: /drums$/ })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Find preset bank-studio'), {
      target: { value: 'strings' },
    })
    expect(screen.getByText('Preset (1)')).toBeInTheDocument()

    expect(screen.getByLabelText('Instrument name bank-studio')).toHaveValue(
      'Warm Strings',
    )
    fireEvent.change(screen.getByLabelText('Instrument name bank-studio'), {
      target: { value: 'Strings' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview C4' }))
    await waitFor(() =>
      expect(audition).toHaveBeenCalledWith(
        expect.objectContaining({ digest }),
        presets[1],
        60,
        false,
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }))
    const next = currentComposition()
    expect(next.instruments.slice(0, initial.instruments.length).map(({ id }) => id))
      .toEqual(initialInstrumentIds)
    expect(next.parts.map((part) => part.instrumentId)).toEqual(
      initialPartAssignments,
    )
    expect(next.instruments.slice(-2)).toMatchObject([
      { name: 'Strings', kind: 'soundfont', presetName: 'Warm Strings' },
      { name: 'Strings 2', kind: 'soundfont', presetName: 'Warm Strings' },
    ])
    expect(screen.queryByLabelText('Assign preset bank-studio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use preset' })).not.toBeInTheDocument()
  })

  it('shows only drum presets and adds one fixed drum note', async () => {
    const audition = vi.fn(async () => undefined)
    render(<Harness inspectBank={vi.fn(async () => presets)} audition={audition} />)

    expect(await screen.findByText('ready')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Playback bank-studio'), {
      target: { value: 'drums' },
    })
    expect(screen.getByLabelText('Playback bank-studio')).toHaveValue('drums')
    expect(screen.getByText('Preset (1)')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Standard Kit.*drums$/ }))
      .toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Grand Piano/ }))
      .not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Find preset bank-studio'), {
      target: { value: 'drums' },
    })
    expect(screen.getByText('Preset (1)')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Find preset bank-studio'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('MIDI note bank-studio'), {
      target: { value: '36' },
    })
    fireEvent.change(screen.getByLabelText('Instrument name bank-studio'), {
      target: { value: 'Kick' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview C2' }))

    await waitFor(() =>
      expect(audition).toHaveBeenCalledWith(
        expect.objectContaining({ digest }),
        presets[2],
        36,
        true,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }))

    expect(currentComposition().instruments.at(-1)).toMatchObject({
      name: 'Kick',
      kind: 'soundfont',
      bank: 15_360,
      program: 0,
      percussion: true,
      trigger: { kind: 'one-shot', note: 36 },
    })
  })

  it('disables drum authoring when a bank has no drum presets', async () => {
    render(<Harness inspectBank={vi.fn(async () => presets.slice(0, 2))} />)

    expect(await screen.findByText('ready')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Playback bank-studio'), {
      target: { value: 'drums' },
    })

    expect(screen.getByText('Preset (0)')).toBeInTheDocument()
    expect(screen.getByLabelText('Preset bank-studio')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'No matching presets' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview C4' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add instrument' })).toBeDisabled()
  })

  it('no longer carries the setup controls, which moved to Settings', async () => {
    render(<Harness inspectBank={vi.fn(async () => presets)} />)

    expect(await screen.findByText('ready')).toBeInTheDocument()
    expect(screen.queryByLabelText('SoundFont file')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('SoundFont license')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('SoundFont attribution')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Import local bank' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Relink bank-studio')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remove local bytes' }),
    ).not.toBeInTheDocument()
    // Provenance travels with the controls that act on it.
    expect(screen.queryByText('CC0 test bank')).not.toBeInTheDocument()
  })

  it('reports an unreachable bank and offers the way to the fix', async () => {
    const onOpenSettings = vi.fn()
    render(
      <Harness
        inspectBank={vi.fn(async () => {
          throw new Error('Studio.sf2 is not in local storage. Relink it.')
        })}
        onOpenSettings={onOpenSettings}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Relink')
    // A native Instrument is untouched by a bank that cannot be reached.
    expect(currentComposition().instruments[0].kind).toBe('native-synth')
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }))
    expect(onOpenSettings).toHaveBeenCalled()
  })

  it('points at Settings when the Composition references no bank at all', () => {
    const empty = structuredClone(defaultComposition) as Composition
    empty.soundBanks = []
    const onOpenSettings = vi.fn()
    render(
      <Harness
        initial={empty}
        inspectBank={vi.fn(async () => presets)}
        onOpenSettings={onOpenSettings}
      />,
    )

    expect(screen.getByText(/Import one in Settings/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage banks' }))
    expect(onOpenSettings).toHaveBeenCalled()
  })
})
