import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import type { Composition, SoundBankReference } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import type { StoredSoundBankMetadata } from '../audio/soundbankStore'
import type { SoundFontPreset } from '../audio/soundfontEngine'
import { SoundBankPanel } from './SoundBankPanel'
import {
  SoundBankSettings,
  type SoundBankVault,
} from './SoundBankSettings'
import { useSoundBankViews } from './useSoundBankViews'

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

const bankFreeDefault = () => {
  const composition = structuredClone(defaultComposition) as Composition
  // These tests exercise importing a bank into a Composition that has none.
  // The default ships with the bundled bank referenced, so it is cleared
  // rather than left to appear as a second bank card in every assertion.
  composition.soundBanks = []
  return composition
}

type HarnessProps = {
  initial?: Composition
  vault: SoundBankVault
  inspectBank: (
    reference: SoundBankReference,
  ) => Promise<ReadonlyArray<SoundFontPreset>>
  invalidateBank?: (soundBankId: string) => void
}

/**
 * Mounts Settings and the rail panel over one shared views hook, the way the
 * app does. Importing in one surface has to light the other up, and that is
 * exactly what the split put at risk.
 */
function Harness({
  initial,
  vault: bankVault,
  inspectBank,
  invalidateBank = vi.fn(),
}: HarnessProps) {
  const [composition, setComposition] = useState(initial ?? bankFreeDefault)
  const banks = useSoundBankViews({ composition, inspectBank })
  return (
    <>
      <SoundBankSettings
        composition={composition}
        onChange={setComposition}
        vault={bankVault}
        banks={banks}
        invalidateBank={invalidateBank}
      />
      <SoundBankPanel
        composition={composition}
        onChange={setComposition}
        banks={banks}
        audition={vi.fn(async () => undefined)}
        onOpenSettings={vi.fn()}
      />
    </>
  )
}

describe('SoundBankSettings', () => {
  it('imports a bank, records its provenance, and makes it assignable in the rail', async () => {
    const bankVault = vault()
    const invalidateBank = vi.fn()
    render(
      <Harness
        vault={bankVault}
        inspectBank={vi.fn(async () => presets)}
        invalidateBank={invalidateBank}
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

    await waitFor(() => expect(bankVault.importBank).toHaveBeenCalled())
    expect(invalidateBank).toHaveBeenCalled()
    // Provenance is reported here, where the controls that act on it live.
    expect(await screen.findByText(metadata.license)).toBeInTheDocument()
    expect(screen.getByText(metadata.attribution)).toBeInTheDocument()
    expect(screen.getByText('SF2')).toBeInTheDocument()

    // …and the rail, sharing the same views, can now assign from it.
    expect(await screen.findByLabelText(/^Preset bank-/)).toHaveValue('0')
  })

  it('refuses an import with no licence recorded', async () => {
    const bankVault = vault()
    render(<Harness vault={bankVault} inspectBank={vi.fn(async () => presets)} />)

    fireEvent.change(screen.getByLabelText('SoundFont file'), {
      target: { files: [new File([new Uint8Array([1])], 'Studio.sf2')] },
    })
    fireEvent.change(screen.getByLabelText('SoundFont license'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import local bank' }))

    expect(
      await screen.findByText('Record the bank license before importing it.'),
    ).toBeInTheDocument()
    expect(bankVault.importBank).not.toHaveBeenCalled()
  })

  it('relinks a missing bank and clears the alert in both surfaces', async () => {
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
      <Harness initial={initial} vault={bankVault} inspectBank={inspectBank} />,
    )

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Relink bank-studio'), {
      target: { files: [new File([new Uint8Array([1])], 'Studio.sf2')] },
    })

    await waitFor(() => expect(bankVault.relink).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0))
    // Both cards read the one shared inspection.
    expect(screen.getAllByText('ready')).toHaveLength(2)
  })

  it('refuses a relink whose format does not match the reference', async () => {
    const initial = structuredClone(defaultComposition) as Composition
    initial.soundBanks = [reference]
    const bankVault = vault()
    render(
      <Harness
        initial={initial}
        vault={bankVault}
        inspectBank={vi.fn(async () => presets)}
      />,
    )

    fireEvent.change(await screen.findByLabelText('Relink bank-studio'), {
      target: { files: [new File([new Uint8Array([1])], 'Other.sf3')] },
    })

    expect(
      await screen.findByText('Choose a matching .sf2 bank for relink.'),
    ).toBeInTheDocument()
    expect(bankVault.relink).not.toHaveBeenCalled()
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
      />,
    )

    expect((await screen.findAllByText('ready')).length).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Remove local bytes' }))

    await waitFor(() => expect(bankVault.delete).toHaveBeenCalledWith(digest))
    expect(screen.getAllByText(metadata.name, { selector: 'strong' })).toHaveLength(2)
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Relink')
  })
})
