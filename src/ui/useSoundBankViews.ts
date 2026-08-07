import { useCallback, useEffect, useState } from 'react'

import { bundledSoundBank, type BundledBankState } from '../audio/bundledSoundBank'
import type { Composition, SoundBankReference } from '../core/composition'
import type { SoundFontPreset } from '../audio/soundfontEngine'

/**
 * Shared bank-inspection state.
 *
 * Two surfaces read the same banks and neither owns them: the rail panel
 * browses presets to assign, and the Settings dialog imports, relinks, and
 * removes. Inspecting a 38 MB bank twice because two components each held their
 * own copy of this would be a real cost, and the two copies would disagree the
 * moment one of them relinked. So the state is lifted once, into the app, and
 * both surfaces are handed the same map.
 */

export type BankView =
  | { state: 'loading'; presets: ReadonlyArray<SoundFontPreset> }
  | { state: 'ready'; presets: ReadonlyArray<SoundFontPreset> }
  | {
      state: 'missing' | 'unsupported' | 'failed'
      presets: ReadonlyArray<SoundFontPreset>
      message: string
    }

export type SoundBankViews = Readonly<{
  views: Readonly<Record<string, BankView>>
  /**
   * Re-inspects one bank and folds the result into the shared map. Resolves
   * with its presets, or rejects with the reason, so a caller can report the
   * outcome of the action that prompted it.
   */
  refresh: (
    reference: SoundBankReference,
  ) => Promise<ReadonlyArray<SoundFontPreset>>
  /** Records a state without inspecting, for a bank just emptied on purpose. */
  setView: (soundBankId: string, view: BankView) => void
}>

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/** Sorts a load failure into the three the UI reports differently. */
const failureState = (message: string): 'missing' | 'unsupported' | 'failed' =>
  message.includes('not in local storage')
    ? 'missing'
    : message.includes('unsupported')
      ? 'unsupported'
      : 'failed'

export type UseSoundBankViewsOptions = Readonly<{
  composition: Composition
  bundledBankState?: BundledBankState
  inspectBank: (
    reference: SoundBankReference,
  ) => Promise<ReadonlyArray<SoundFontPreset>>
}>

export function useSoundBankViews({
  composition,
  bundledBankState,
  inspectBank,
}: UseSoundBankViewsOptions): SoundBankViews {
  const [views, setViews] = useState<Record<string, BankView>>({})

  const setView = useCallback((soundBankId: string, view: BankView) => {
    setViews((current) => ({ ...current, [soundBankId]: view }))
  }, [])

  const refresh = useCallback(
    async (reference: SoundBankReference) => {
      try {
        const presets = await inspectBank(reference)
        setViews((current) => ({
          ...current,
          [reference.id]: { state: 'ready', presets },
        }))
        return presets
      } catch (error) {
        const message = errorMessage(error)
        setViews((current) => ({
          ...current,
          [reference.id]: {
            state: failureState(message),
            presets: [],
            message,
          },
        }))
        throw error
      }
    },
    [inspectBank],
  )

  useEffect(() => {
    let cancelled = false
    for (const reference of composition.soundBanks) {
      // The bundled bank arrives on its own, in the background. Inspecting it
      // before it lands would report "not in local storage" as a failure, when
      // in fact nothing has gone wrong and nothing is expected of the user.
      if (
        reference.digest === bundledSoundBank.digest &&
        bundledBankState &&
        bundledBankState.state !== 'present'
      ) {
        continue
      }
      void inspectBank(reference)
        .then((presets) => {
          if (cancelled) return
          setViews((current) => ({
            ...current,
            [reference.id]: { state: 'ready', presets },
          }))
        })
        .catch((error) => {
          if (cancelled) return
          const message = errorMessage(error)
          setViews((current) => ({
            ...current,
            [reference.id]: {
              state: failureState(message),
              presets: [],
              message,
            },
          }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [bundledBankState, composition.soundBanks, inspectBank])

  return { views, refresh, setView }
}
