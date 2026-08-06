import { bundledSoundBank } from '../core/defaultComposition'
import { sha256Hex, type SoundBankStore } from './soundbankStore'

/**
 * Fetching and verifying the bundled sound bank.
 *
 * The reference itself is Composition data and lives in core. The bytes are not
 * in this repository at all: `scripts/fetch-soundbank.mjs` downloads them into
 * `public/soundbanks/` at build time and verifies the digest, because 38 MB of
 * binary that never changes is paid for by every clone forever and is
 * reproducible from its hash.
 *
 * Serving it as a static file rather than bundling it means the browser caches
 * it normally and a Composition with no SoundFont Instrument never requests it.
 * If the fetch failed, the app simply reports the bundled bank as unavailable
 * and every native Instrument plays as usual.
 */
export { bundledSoundBank }

export const bundledSoundBankPath = 'soundbanks/MuseScore_General.sf3'
export const bundledSoundBankLicensePath =
  'soundbanks/MuseScore_General_License.md'

/** Approximate download size, for telling a user what they are waiting for. */
export const bundledSoundBankBytes = 39_900_972

export type BundledBankState =
  | Readonly<{ state: 'idle' | 'present' }>
  | Readonly<{ state: 'fetching'; receivedBytes: number }>
  | Readonly<{ state: 'failed'; message: string }>

export type EnsureBundledBankOptions = Readonly<{
  store: SoundBankStore
  fetchImpl?: typeof fetch
  baseUrl?: string
  signal?: AbortSignal
  onState?: (state: BundledBankState) => void
}>

/**
 * Puts the bundled bank in the local vault if it is not already there.
 *
 * Idempotent and content-addressed: a vault that already holds the digest does
 * no network work at all, so this is safe to call on every start. The bytes are
 * verified against the digest before they are stored, so a truncated or
 * substituted download is refused rather than cached as a broken bank.
 *
 * Never called during first paint. A 38 MB fetch belongs behind the moment a
 * Composition actually needs a SoundFont, not in front of the first frame.
 */
export const ensureBundledSoundBank = async (
  options: EnsureBundledBankOptions,
): Promise<BundledBankState> => {
  const {
    store,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    baseUrl = '/',
    signal,
    onState,
  } = options

  const report = (state: BundledBankState) => {
    onState?.(state)
    return state
  }

  try {
    if (await store.get(bundledSoundBank.digest)) {
      return report({ state: 'present' })
    }
  } catch {
    // An unreadable vault is reported by the fetch path below rather than here.
  }

  if (!fetchImpl) {
    return report({
      state: 'failed',
      message: 'This browser cannot fetch the bundled sound bank.',
    })
  }

  report({ state: 'fetching', receivedBytes: 0 })

  try {
    const response = await fetchImpl(`${baseUrl}${bundledSoundBankPath}`, {
      signal,
    })
    if (!response.ok) {
      return report({
        state: 'failed',
        message: `The bundled sound bank could not be downloaded (${response.status}).`,
      })
    }

    const bytes = await response.arrayBuffer()
    const digest = await sha256Hex(bytes)
    if (digest !== bundledSoundBank.digest) {
      return report({
        state: 'failed',
        message: `The bundled sound bank did not match its digest and was not stored.`,
      })
    }

    await store.importBank({
      bytes,
      name: bundledSoundBank.name,
      format: bundledSoundBank.format,
      license: bundledSoundBank.license,
      attribution: bundledSoundBank.attribution,
    })
    return report({ state: 'present' })
  } catch (error) {
    if (signal?.aborted) return report({ state: 'idle' })
    return report({
      state: 'failed',
      message: `The bundled sound bank could not be prepared: ${
        error instanceof Error ? error.message : String(error)
      }`,
    })
  }
}
