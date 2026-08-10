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
      <output aria-label="Instrument kind">
        {composition.instruments[0]?.kind}
      </output>
      <output aria-label="Instrument preset">
        {composition.instruments[0]?.kind === 'soundfont'
          ? composition.instruments[0].presetName
          : ''}
      </output>
    </>
  )
}

describe('SoundBankPanel', () => {
  it('browses, auditions, and assigns a preset', async () => {
    const audition = vi.fn(async () => undefined)
    render(<Harness inspectBank={vi.fn(async () => presets)} audition={audition} />)

    expect(await screen.findByText('ready')).toBeInTheDocument()
    expect(screen.getByLabelText('Preset bank-studio')).toHaveValue('0')

    fireEvent.change(screen.getByLabelText('Find preset bank-studio'), {
      target: { value: 'strings' },
    })
    expect(screen.getByText('Preset (1)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Audition C4 bank-studio' }))
    await waitFor(() =>
      expect(audition).toHaveBeenCalledWith(
        expect.objectContaining({ digest }),
        presets[1],
        60,
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use preset' }))
    expect(screen.getByLabelText('Instrument kind')).toHaveTextContent('soundfont')
    expect(screen.getByLabelText('Instrument preset')).toHaveTextContent(
      'Warm Strings',
    )
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
    expect(screen.getByLabelText('Instrument kind')).toHaveTextContent(
      'native-synth',
    )
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
