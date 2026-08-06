import type {
  Composition,
  SoundBankFormat,
  SoundBankReference,
} from '../core/composition'
import { validateComposition } from '../core/compositionValidation'
import type { Recording } from '../core/recording'
import {
  sha256Hex,
  SoundBankStoreError,
  type SoundBankStore,
  type StoredSoundBankMetadata,
} from '../audio/soundbankStore'

/**
 * The portable `.spirophonic` bundle.
 *
 * One JSON document rather than an archive: the project has no compression
 * dependency, and a bundle a person can open in a text editor is one they can
 * audit before importing. Bank bytes, when present at all, are base64 inside
 * the same document.
 *
 * Embedding is never automatic. A bank is copied into a bundle only when the
 * caller decides so for that specific bank, because whether redistribution is
 * allowed depends on the bank's licence and only a person can read it. The
 * default produces a manifest that names what is needed without shipping it.
 */
export const projectBundleVersion = 1

export type BundleAsset = Readonly<{
  soundBankId: string
  digest: string
  name: string
  format: SoundBankFormat
  byteLength: number
  license: string
  attribution: string
  /** Base64 bank bytes, present only when embedding was explicitly chosen. */
  bytes?: string
  /** Why the bytes are absent, so an importer can say something useful. */
  omittedReason?: 'not-permitted' | 'not-in-vault'
}>

export type ProjectBundle = Readonly<{
  bundleVersion: number
  name: string
  createdAt: string
  composition: Composition
  recordings: ReadonlyArray<Recording>
  assets: ReadonlyArray<BundleAsset>
}>

export type EmbedDecision = (
  reference: SoundBankReference,
  metadata: StoredSoundBankMetadata,
) => boolean

export type CreateBundleOptions = Readonly<{
  composition: Composition
  recordings?: ReadonlyArray<Recording>
  store?: SoundBankStore
  name?: string
  now?: () => string
  /**
   * Decides, per bank, whether its bytes may travel. Defaults to refusing:
   * a manifest-only bundle is always safe to share, an embedded one may not be.
   */
  mayEmbed?: EmbedDecision
}>

export type CreateBundleResult = Readonly<{
  bundle: ProjectBundle
  json: string
  embeddedDigests: ReadonlyArray<string>
  issues: ReadonlyArray<string>
}>

export type BundleAssetStatus =
  | 'restored'
  | 'already-present'
  | 'missing'
  | 'digest-mismatch'
  | 'conflict'
  | 'store-failed'

export type BundleAssetOutcome = Readonly<{
  soundBankId: string
  digest: string
  name: string
  status: BundleAssetStatus
  message: string
}>

export type ImportBundleResult = Readonly<{
  composition: Composition
  recordings: ReadonlyArray<Recording>
  assets: ReadonlyArray<BundleAssetOutcome>
  /** Digests the bundle needs that are neither embedded nor already local. */
  missingDigests: ReadonlyArray<string>
  /** True when every bank the Composition references is available to play. */
  playable: boolean
}>

export type BundleParseResult =
  | Readonly<{ ok: true; bundle: ProjectBundle }>
  | Readonly<{ ok: false; issues: ReadonlyArray<string> }>

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key])
    }
    return sorted
  }
  return value
}

/**
 * Base64 without Node's Buffer, chunked so a multi-megabyte bank does not
 * exhaust the argument limit of String.fromCharCode.
 */
export const encodeBase64 = (bytes: ArrayBuffer) => {
  const view = new Uint8Array(bytes)
  const chunk = 0x8000
  let binary = ''
  for (let offset = 0; offset < view.length; offset += chunk) {
    binary += String.fromCharCode(...view.subarray(offset, offset + chunk))
  }
  return btoa(binary)
}

export const decodeBase64 = (text: string) => {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

export const bundleFileName = (name: string) =>
  `${
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    'composition'
  }.spirophonic`

export const createProjectBundle = async (
  options: CreateBundleOptions,
): Promise<CreateBundleResult> => {
  const {
    composition,
    recordings = [],
    store,
    name = composition.name,
    now = () => new Date().toISOString(),
    mayEmbed = () => false,
  } = options

  const issues: Array<string> = []
  const embeddedDigests: Array<string> = []
  const assets: Array<BundleAsset> = []

  for (const reference of composition.soundBanks) {
    let stored: Awaited<ReturnType<SoundBankStore['get']>>
    try {
      stored = await store?.get(reference.digest)
    } catch (error) {
      issues.push(
        `Could not read ${reference.name} from the vault: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      stored = undefined
    }

    // Provenance travels whether or not the bytes do; that is the whole point
    // of a manifest-only bundle.
    const base = {
      soundBankId: reference.id,
      digest: reference.digest,
      name: reference.name,
      format: reference.format,
      license: stored?.metadata.license ?? reference.license,
      attribution: stored?.metadata.attribution ?? reference.attribution,
    }

    if (!stored) {
      assets.push(
        Object.freeze({
          ...base,
          byteLength: 0,
          omittedReason: 'not-in-vault' as const,
        }),
      )
      issues.push(
        `${reference.name} is not in this browser's vault, so the bundle can only name it.`,
      )
      continue
    }

    if (!mayEmbed(reference, stored.metadata)) {
      assets.push(
        Object.freeze({
          ...base,
          byteLength: stored.metadata.byteLength,
          omittedReason: 'not-permitted' as const,
        }),
      )
      continue
    }

    assets.push(
      Object.freeze({
        ...base,
        byteLength: stored.metadata.byteLength,
        bytes: encodeBase64(stored.bytes),
      }),
    )
    embeddedDigests.push(reference.digest)
  }

  const bundle: ProjectBundle = Object.freeze({
    bundleVersion: projectBundleVersion,
    name,
    createdAt: now(),
    composition,
    recordings: Object.freeze([...recordings]),
    assets: Object.freeze(assets),
  })

  return Object.freeze({
    bundle,
    json: `${JSON.stringify(sortKeysDeep(bundle), null, 2)}\n`,
    embeddedDigests: Object.freeze(embeddedDigests),
    issues: Object.freeze(issues),
  })
}

export const parseProjectBundle = (text: string): BundleParseResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return Object.freeze({
      ok: false as const,
      issues: Object.freeze([
        `Bundle is not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ]),
    })
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return Object.freeze({
      ok: false as const,
      issues: Object.freeze(['Expected a Spirophonic bundle object.']),
    })
  }

  const record = parsed as Record<string, unknown>
  const issues: Array<string> = []

  if (typeof record.bundleVersion !== 'number') {
    issues.push('Missing "bundleVersion".')
  } else if (record.bundleVersion > projectBundleVersion) {
    // A newer bundle is refused rather than partially read.
    issues.push(
      `Bundle format version ${record.bundleVersion} is newer than this engine's ${projectBundleVersion}.`,
    )
  }
  if (!Array.isArray(record.assets)) issues.push('Missing "assets".')
  if (record.recordings !== undefined && !Array.isArray(record.recordings)) {
    issues.push('"recordings" must be a list.')
  }

  const validation = validateComposition(record.composition)
  if (!validation.ok) {
    issues.push(
      `Bundle Composition is invalid: ${
        validation.issues[0]?.message ?? 'unknown reason'
      }`,
    )
  }

  if (issues.length > 0) {
    return Object.freeze({ ok: false as const, issues: Object.freeze(issues) })
  }
  return Object.freeze({ ok: true as const, bundle: parsed as ProjectBundle })
}

/**
 * Restores a bundle into this browser.
 *
 * Nothing in the local vault is overwritten. A digest already present is left
 * exactly as it is, and an asset whose bytes do not hash to their declared
 * digest is refused rather than stored, so a tampered or truncated bundle
 * cannot quietly replace a good bank.
 */
export const importProjectBundle = async (
  bundle: ProjectBundle,
  options: Readonly<{ store?: SoundBankStore }> = {},
): Promise<ImportBundleResult> => {
  const { store } = options
  const outcomes: Array<BundleAssetOutcome> = []
  const missingDigests: Array<string> = []

  const referenceById = new Map(
    bundle.composition.soundBanks.map((reference) => [reference.id, reference]),
  )

  for (const asset of bundle.assets) {
    const reference = referenceById.get(asset.soundBankId)
    const record = (status: BundleAssetStatus, message: string) =>
      outcomes.push(
        Object.freeze({
          soundBankId: asset.soundBankId,
          digest: asset.digest,
          name: asset.name,
          status,
          message,
        }),
      )

    if (reference && reference.digest !== asset.digest) {
      record(
        'conflict',
        `${asset.name} carries digest ${asset.digest.slice(0, 12)}… but the Composition asks for ${reference.digest.slice(0, 12)}….`,
      )
      missingDigests.push(reference.digest)
      continue
    }

    const existing = store ? await safeGet(store, asset.digest) : undefined
    if (existing) {
      record(
        'already-present',
        `${asset.name} is already in this browser's vault and was left untouched.`,
      )
      continue
    }

    if (!asset.bytes) {
      record(
        'missing',
        asset.omittedReason === 'not-permitted'
          ? `${asset.name} was not embedded in this bundle; import it from your own copy (SHA-256 ${asset.digest.slice(0, 12)}…).`
          : `${asset.name} is not available locally and was not embedded (SHA-256 ${asset.digest.slice(0, 12)}…).`,
      )
      missingDigests.push(asset.digest)
      continue
    }

    let bytes: ArrayBuffer
    try {
      bytes = decodeBase64(asset.bytes)
    } catch {
      record('digest-mismatch', `${asset.name} has unreadable embedded bytes.`)
      missingDigests.push(asset.digest)
      continue
    }

    const actual = await sha256Hex(bytes).catch(() => undefined)
    if (actual !== asset.digest) {
      record(
        'digest-mismatch',
        `${asset.name} does not match its declared digest and was not stored.`,
      )
      missingDigests.push(asset.digest)
      continue
    }

    if (!store) {
      record('missing', `${asset.name} verified, but there is no vault to store it in.`)
      missingDigests.push(asset.digest)
      continue
    }

    try {
      await store.importBank({
        bytes,
        name: asset.name,
        format: asset.format,
        license: asset.license,
        attribution: asset.attribution,
      })
      record('restored', `${asset.name} was restored into this browser's vault.`)
    } catch (error) {
      record(
        'store-failed',
        `${asset.name} could not be stored: ${
          error instanceof SoundBankStoreError || error instanceof Error
            ? error.message
            : String(error)
        }`,
      )
      missingDigests.push(asset.digest)
    }
  }

  // A bank the Composition references but the bundle never listed is missing
  // too; silence about it would be the worst outcome.
  const listed = new Set(bundle.assets.map((asset) => asset.soundBankId))
  for (const reference of bundle.composition.soundBanks) {
    if (listed.has(reference.id)) continue
    const existing = store ? await safeGet(store, reference.digest) : undefined
    if (existing) continue
    outcomes.push(
      Object.freeze({
        soundBankId: reference.id,
        digest: reference.digest,
        name: reference.name,
        status: 'missing' as const,
        message: `${reference.name} is referenced by the Composition but absent from the bundle manifest.`,
      }),
    )
    missingDigests.push(reference.digest)
  }

  return Object.freeze({
    composition: bundle.composition,
    recordings: Object.freeze([...(bundle.recordings ?? [])]),
    assets: Object.freeze(outcomes),
    missingDigests: Object.freeze([...new Set(missingDigests)]),
    playable: missingDigests.length === 0,
  })
}

const safeGet = async (store: SoundBankStore, digest: string) => {
  try {
    return await store.get(digest)
  } catch {
    // An unreadable record is treated as absent; import must not overwrite it,
    // and the caller learns about it through the asset outcome instead.
    return undefined
  }
}

export const downloadProjectBundle = (result: CreateBundleResult) => {
  const blob = new Blob([result.json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = bundleFileName(result.bundle.name)
  anchor.click()
  URL.revokeObjectURL(url)
}
