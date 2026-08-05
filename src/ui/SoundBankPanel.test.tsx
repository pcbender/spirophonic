import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import type { Composition, SoundBankReference } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import type { StoredSoundBankMetadata } from '../audio/soundbankStore'
import type { SoundFontPreset } from '../audio/soundfontEngine'
import {
  SoundBankPanel,
  type SoundBankPanelProps,
  type SoundBankVault,
} from './SoundBankPanel'

afterEach(cleanup)

const digest = 'b'.repeat(64)
const metadata: StoredSoundBankMetadata = {
  digest,
  name: 'Studio.sf2',
  format: 'sf2',
  byteLength: 12,
  license: 'CC0 test bank',
  attribution: 'Example author',
  importedAt: '2026-08-05T00:00:00.000Z',
}
const presets: Array<SoundFontPreset> = [
  { name: 'Grand Piano', bankMSB: 0, bankLSB: 0, program: 0, isDrum: false },
  { name: 'Warm Strings', bankMSB: 0, bankLSB: 0, program: 48, isDrum: false },
  { name: 'Standard Kit', bankMSB: 120, bankLSB: 0, program: 0, isDrum: true },
]

const reference: SoundBankReference = {
  id: 'bank-studio',
  name: metadata.name,
  digest,
  format: 'sf2',
  source: 'local',
  license: metadata.license,
  attribution: metadata.attribution,
}

const vault = (): SoundBankVault => ({
  importBank: vi.fn(async () => ({ metadata, created: true })),
  relink: vi.fn(async () => metadata),
  delete: vi.fn(async () => true),
  toReference: vi.fn((id: string) => ({ ...reference, id })),
})

type HarnessProps = Omit<
  SoundBankPanelProps,
  'composition' | 'onChange'
> & { initial?: Composition }

function Harness({ initial, ...props }: HarnessProps) {
  const [composition, setComposition] = useState(
    initial ?? (structuredClone(defaultComposition) as Composition),
  )
  return (
    <>
      <SoundBankPanel
        {...props}
        composition={composition}
        onChange={setComposition}
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
  it('imports, displays provenance, browses, auditions, and assigns a preset', async () => {
    const bankVault = vault()
    const inspectBank = vi.fn(async () => presets)
    const audition = vi.fn(async () => undefined)
    render(
      <Harness
        vault={bankVault}
        inspectBank={inspectBank}
        audition={audition}
        invalidateBank={vi.fn()}
      />,
    )

    const file = new File([new Uint8Array([1, 2, 3])], 'Studio.sf2')
    fireEvent.change(screen.getByLabelText('SoundFont file'), {
      target: { files: [file] },
    })
    fireEvent.change(screen.getByLabelText('SoundFont license'), {
      target: { value: 'CC0 test bank' },
    })
    fireEvent.change(screen.getByLabelText('SoundFont attribution'), {
      target: { value: 'Example author' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import local bank' }))

    expect(await screen.findByText(metadata.name, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(metadata.license)).toBeInTheDocument()
    expect(screen.getByText(metadata.attribution)).toBeInTheDocument()
    expect(screen.getByLabelText(/Preset bank-/)).toHaveValue('0')

    fireEvent.click(screen.getByRole('button', { name: /Audition C4 bank-/ }))
    await waitFor(() => expect(audition).toHaveBeenCalledWith(
      expect.objectContaining({ digest }),
      presets[0],
      60,
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Use preset' }))
    expect(screen.getByLabelText('Instrument kind')).toHaveTextContent('soundfont')
    expect(screen.getByLabelText('Instrument preset')).toHaveTextContent('Grand Piano')
  })

  it('keeps a missing reference visible and supports relink without hiding native Instruments', async () => {
    const initial = structuredClone(defaultComposition) as Composition
    initial.soundBanks = [reference]
    let linked = false
    const inspectBank = vi.fn(async () => {
      if (!linked) throw new Error('Studio.sf2 is not in local storage. Relink it.')
      return presets
    })
    const bankVault = vault()
    bankVault.relink = vi.fn(async () => {
      linked = true
      return metadata
    })
    render(
      <Harness
        initial={initial}
        vault={bankVault}
        inspectBank={inspectBank}
        audition={vi.fn(async () => undefined)}
        invalidateBank={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Relink')
    expect(screen.getByLabelText('Instrument kind')).toHaveTextContent('native-synth')
    const file = new File([new Uint8Array([1])], 'Studio.sf2')
    fireEvent.change(screen.getByLabelText('Relink bank-studio'), {
      target: { files: [file] },
    })
    await waitFor(() => expect(bankVault.relink).toHaveBeenCalled())
    expect(await screen.findByText('ready')).toBeInTheDocument()
  })

  it('removes local bytes while preserving the Composition reference', async () => {
    const initial = structuredClone(defaultComposition) as Composition
    initial.soundBanks = [reference]
    const bankVault = vault()
    render(
      <Harness
        initial={initial}
        vault={bankVault}
        inspectBank={vi.fn(async () => presets)}
        audition={vi.fn(async () => undefined)}
        invalidateBank={vi.fn()}
      />,
    )

    expect(await screen.findByText('ready')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove local bytes' }))
    await waitFor(() => expect(bankVault.delete).toHaveBeenCalledWith(digest))
    expect(screen.getByText(metadata.name, { selector: 'strong' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Relink')
  })
})
