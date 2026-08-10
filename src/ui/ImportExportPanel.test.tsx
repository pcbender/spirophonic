import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { gatedModulationComposition } from '../test/fixtures/gateModulation'
import type {
  SoundBankStore,
  StoredSoundBankMetadata,
} from '../audio/soundbankStore'
import { ImportExportPanel } from './ImportExportPanel'

afterEach(cleanup)

const metadata = (
  digest: string,
  byteLength: number,
): StoredSoundBankMetadata => ({
  digest,
  name: `${digest.slice(0, 4)}.sf2`,
  format: 'sf2',
  byteLength,
  license: 'Test',
  attribution: '',
  importedAt: '2026-08-05T00:00:00.000Z',
})

const compositionWithBanks = (count: number) => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.soundBanks = Array.from({ length: count }, (_unused, index) => ({
    id: `bank-${index}`,
    name: `Bank ${index}`,
    digest: String(index).repeat(64).slice(0, 64),
    format: 'sf2' as const,
    source: 'local' as const,
    license: 'Test',
    attribution: '',
  }))
  return composition
}

const vaultHolding = (held: Array<StoredSoundBankMetadata>) =>
  ({ list: vi.fn(async () => held) }) as unknown as SoundBankStore

const renderPanel = (
  composition: Composition,
  vault?: SoundBankStore,
) => {
  const performance = compilePerformance(composition, {
    startSeconds: 0,
    durationSeconds: 2,
    sampleRateHz: 120,
  })
  return render(
    <ImportExportPanel
      composition={composition}
      performance={performance}
      onImport={vi.fn()}
      vault={vault}
    />,
  )
}

const openBundleDialog = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Export bundle' }))

describe('ImportExportPanel bundle dialog', () => {
  it('reports a lossy Strudel modulation grid instead of flattening silently', async () => {
    renderPanel(gatedModulationComposition())

    fireEvent.click(screen.getByRole('button', { name: 'Copy Strudel' }))

    expect(
      await screen.findByText(/Strudel reduced lane .* pattern grid/),
    ).toBeInTheDocument()
  })

  it('keeps the embed choice out of the bar until Export bundle is pressed', () => {
    renderPanel(compositionWithBanks(1), vaultHolding([]))

    // The whole point of the move: it is not sitting in the header being read.
    expect(
      screen.queryByLabelText('Embed sound banks in bundle'),
    ).not.toBeInTheDocument()

    openBundleDialog()
    expect(
      screen.getByLabelText('Embed sound banks in bundle'),
    ).toBeInTheDocument()
  })

  it('reports what embedding costs, in a unit that reads', async () => {
    const composition = compositionWithBanks(1)
    const vault = vaultHolding([
      metadata(composition.soundBanks[0].digest, 39_900_972),
    ])
    renderPanel(composition, vault)
    openBundleDialog()

    // Off by default: a manifest is small, and the sentence says so.
    expect(await screen.findByText(/1 bank reference, no audio/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Embed sound banks in bundle'))
    expect(
      await screen.findByText(/Embedding 1 bank adds about 38\.1 MB\./),
    ).toBeInTheDocument()
  })

  it('sizes a small bank in kilobytes rather than rounding it to nothing', async () => {
    const composition = compositionWithBanks(1)
    const vault = vaultHolding([metadata(composition.soundBanks[0].digest, 890)])
    renderPanel(composition, vault)
    openBundleDialog()
    fireEvent.click(screen.getByLabelText('Embed sound banks in bundle'))

    // 890 bytes shown as "0.0 MB" reads as free rather than as small.
    expect(await screen.findByText(/adds about 1 KB\./)).toBeInTheDocument()
  })

  it('says plainly when a referenced bank cannot be embedded', async () => {
    const composition = compositionWithBanks(2)
    const vault = vaultHolding([
      metadata(composition.soundBanks[0].digest, 2_097_152),
    ])
    renderPanel(composition, vault)
    openBundleDialog()
    fireEvent.click(screen.getByLabelText('Embed sound banks in bundle'))

    expect(
      await screen.findByText(
        /Embedding 1 of 2 referenced banks adds about 2\.0 MB\. The other 1 is not in the vault/,
      ),
    ).toBeInTheDocument()
  })

  it('does not offer a size it cannot measure', async () => {
    const composition = compositionWithBanks(1)
    renderPanel(composition, undefined)
    openBundleDialog()

    await waitFor(() =>
      expect(
        screen.getByLabelText('Embed sound banks in bundle'),
      ).toBeInTheDocument(),
    )
    // No vault, so no measurement — and no invented number.
    expect(screen.queryByText(/adds about/)).not.toBeInTheDocument()
    expect(screen.queryByText(/no audio/)).not.toBeInTheDocument()
  })

  it('closes without exporting, keeping the choice for next time', async () => {
    const composition = compositionWithBanks(1)
    renderPanel(composition, vaultHolding([]))
    openBundleDialog()

    fireEvent.click(screen.getByLabelText('Embed sound banks in bundle'))
    fireEvent.click(screen.getByRole('button', { name: 'Close export bundle' }))
    expect(
      screen.queryByLabelText('Embed sound banks in bundle'),
    ).not.toBeInTheDocument()

    openBundleDialog()
    expect(
      await screen.findByLabelText('Embed sound banks in bundle'),
    ).toBeChecked()
  })
})
