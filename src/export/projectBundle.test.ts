import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { compilePerformance } from '../core/performance'
import { createRecording } from '../core/recording'
import { SoundBankStore } from '../audio/soundbankStore'
import {
  createProjectBundle,
  decodeBase64,
  encodeBase64,
  importProjectBundle,
  parseProjectBundle,
  projectBundleVersion,
  bundleFileName,
  type ProjectBundle,
} from './projectBundle'

/** SHA-256 of "abc", used so digest checks run against the real algorithm. */
const abcDigest =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
const abcBytes = () => new TextEncoder().encode('abc').buffer

let databaseCounter = 0
const freshStore = () =>
  new SoundBankStore({
    indexedDB: new IDBFactory(),
    databaseName: `bundle-test-${(databaseCounter += 1)}`,
    now: () => '2026-08-06T00:00:00.000Z',
  })

const bankedComposition = (): Composition => {
  const composition = structuredClone(defaultComposition) as Composition
  composition.soundBanks = [
    {
      id: 'bank-1',
      name: 'Grand Piano',
      digest: abcDigest,
      format: 'sf2',
      source: 'local',
      license: 'CC-BY-4.0',
      attribution: 'Recorded by A. Person',
    },
  ]
  return composition
}

const stockedStore = async () => {
  const store = freshStore()
  await store.importBank({
    bytes: abcBytes(),
    name: 'Grand Piano',
    format: 'sf2',
    license: 'CC-BY-4.0',
    attribution: 'Recorded by A. Person',
  })
  return store
}

describe('bundle creation', () => {
  it('ships a manifest without bank bytes unless embedding is chosen', async () => {
    const store = await stockedStore()
    const result = await createProjectBundle({
      composition: bankedComposition(),
      store,
    })

    expect(result.embeddedDigests).toEqual([])
    expect(result.bundle.assets).toHaveLength(1)
    expect(result.bundle.assets[0].bytes).toBeUndefined()
    expect(result.bundle.assets[0].omittedReason).toBe('not-permitted')
    // Provenance travels even when the bytes do not.
    expect(result.bundle.assets[0].license).toBe('CC-BY-4.0')
    expect(result.bundle.assets[0].attribution).toBe('Recorded by A. Person')
    expect(result.bundle.assets[0].byteLength).toBe(3)
  })

  it('embeds only the banks the caller permits, one by one', async () => {
    const store = await stockedStore()
    const composition = bankedComposition()
    composition.soundBanks = [
      ...composition.soundBanks,
      {
        id: 'bank-2',
        name: 'Strings',
        digest: abcDigest,
        format: 'sf3',
        source: 'local',
        license: 'Proprietary',
        attribution: '',
      },
    ]

    const result = await createProjectBundle({
      composition,
      store,
      mayEmbed: (reference) => reference.license === 'CC-BY-4.0',
    })

    const embedded = result.bundle.assets.find((a) => a.soundBankId === 'bank-1')
    const withheld = result.bundle.assets.find((a) => a.soundBankId === 'bank-2')
    expect(embedded?.bytes).toBeDefined()
    expect(withheld?.bytes).toBeUndefined()
    expect(withheld?.omittedReason).toBe('not-permitted')
    expect(result.embeddedDigests).toEqual([abcDigest])
  })

  it('says so when a referenced bank is not in this browser at all', async () => {
    const result = await createProjectBundle({
      composition: bankedComposition(),
      store: freshStore(),
      mayEmbed: () => true,
    })

    expect(result.bundle.assets[0].omittedReason).toBe('not-in-vault')
    expect(result.issues.some((issue) => issue.includes('Grand Piano'))).toBe(true)
  })

  it('serializes the same bundle to the same bytes', async () => {
    const store = await stockedStore()
    const options = {
      composition: bankedComposition(),
      store,
      now: () => '2026-08-06T00:00:00.000Z',
      mayEmbed: () => true,
    }
    const first = await createProjectBundle(options)
    const second = await createProjectBundle(options)
    expect(second.json).toBe(first.json)
    // Keys are sorted, so two bundles can be diffed meaningfully.
    expect(first.json.indexOf('"assets"')).toBeLessThan(
      first.json.indexOf('"bundleVersion"'),
    )
  })

  it('names the file after the Composition', () => {
    expect(bundleFileName('Spiral Study #3')).toBe('spiral-study-3.spirophonic')
    expect(bundleFileName('!!!')).toBe('composition.spirophonic')
  })
})

describe('base64 transport', () => {
  it('round-trips bytes unchanged, including large buffers', () => {
    const bytes = new Uint8Array(70_000)
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = (index * 31) % 256
    }
    const decoded = new Uint8Array(decodeBase64(encodeBase64(bytes.buffer)))
    expect(decoded.length).toBe(bytes.length)
    expect(Array.from(decoded.subarray(0, 64))).toEqual(
      Array.from(bytes.subarray(0, 64)),
    )
    expect(Array.from(decoded.subarray(-64))).toEqual(
      Array.from(bytes.subarray(-64)),
    )
  })
})

describe('bundle parsing', () => {
  it('refuses a bundle newer than this engine', async () => {
    const store = await stockedStore()
    const { bundle } = await createProjectBundle({
      composition: bankedComposition(),
      store,
    })
    const text = JSON.stringify({
      ...bundle,
      bundleVersion: projectBundleVersion + 1,
    })

    const parsed = parseProjectBundle(text)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.issues[0]).toMatch(/newer than/)
    }
  })

  it('refuses malformed JSON and invalid Compositions', () => {
    expect(parseProjectBundle('{oops').ok).toBe(false)
    const bad = parseProjectBundle(
      JSON.stringify({ bundleVersion: 1, assets: [], composition: { id: 1 } }),
    )
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.issues.join(' ')).toMatch(/Composition is invalid/)
  })

  it('accepts what createProjectBundle produced', async () => {
    const store = await stockedStore()
    const result = await createProjectBundle({
      composition: bankedComposition(),
      store,
      mayEmbed: () => true,
    })
    const parsed = parseProjectBundle(result.json)
    expect(parsed.ok).toBe(true)
  })
})

describe('MG-20 bundle acceptance', () => {
  it('restores a Composition and its permitted banks in a clean profile', async () => {
    const source = await stockedStore()
    const composition = bankedComposition()
    const performance = compilePerformance(composition, {
      startSeconds: 0,
      durationSeconds: 2,
      sampleRateHz: 120,
    })
    const recording = createRecording({
      id: 'recording-1',
      name: 'Take',
      composition,
      performance,
    })

    const exported = await createProjectBundle({
      composition,
      recordings: [recording],
      store: source,
      mayEmbed: () => true,
    })

    // A different browser profile: nothing in its vault yet.
    const clean = freshStore()
    const parsed = parseProjectBundle(exported.json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const imported = await importProjectBundle(parsed.bundle, { store: clean })

    expect(imported.playable).toBe(true)
    expect(imported.missingDigests).toEqual([])
    expect(imported.assets[0].status).toBe('restored')
    expect(imported.composition.name).toBe(composition.name)
    expect(imported.recordings).toHaveLength(1)
    expect(imported.recordings[0].id).toBe('recording-1')

    // The bank really is playable from the clean profile now.
    const restored = await clean.get(abcDigest)
    expect(restored?.metadata.byteLength).toBe(3)
    expect(new Uint8Array(restored!.bytes)).toEqual(new Uint8Array(abcBytes()))
  })

  it('reports every missing digest before playback for a manifest-only bundle', async () => {
    const source = await stockedStore()
    const composition = bankedComposition()
    composition.soundBanks = [
      ...composition.soundBanks,
      {
        id: 'bank-2',
        name: 'Strings',
        digest: 'f'.repeat(64),
        format: 'sf2',
        source: 'local',
        license: 'Proprietary',
        attribution: '',
      },
    ]

    const exported = await createProjectBundle({ composition, store: source })
    const imported = await importProjectBundle(exported.bundle, {
      store: freshStore(),
    })

    expect(imported.playable).toBe(false)
    // Every referenced bank is accounted for, not just the first failure.
    expect(imported.missingDigests).toHaveLength(2)
    expect(imported.missingDigests).toContain(abcDigest)
    expect(imported.missingDigests).toContain('f'.repeat(64))
    expect(imported.assets.every((asset) => asset.status === 'missing')).toBe(true)
    for (const asset of imported.assets) {
      expect(asset.message).toMatch(/import it from your own copy|not available/)
    }
  })

  it('preserves licence and provenance across export and import', async () => {
    const source = await stockedStore()
    const exported = await createProjectBundle({
      composition: bankedComposition(),
      store: source,
      mayEmbed: () => true,
    })
    const clean = freshStore()
    await importProjectBundle(exported.bundle, { store: clean })

    const restored = await clean.get(abcDigest)
    expect(restored?.metadata.license).toBe('CC-BY-4.0')
    expect(restored?.metadata.attribution).toBe('Recorded by A. Person')
    expect(restored?.metadata.name).toBe('Grand Piano')
    expect(restored?.metadata.format).toBe('sf2')
  })

  it('never overwrites a bank the vault already holds', async () => {
    const existing = freshStore()
    await existing.importBank({
      bytes: abcBytes(),
      name: 'My Own Piano',
      format: 'sf2',
      license: 'Personal copy',
      attribution: 'Me',
    })

    const source = await stockedStore()
    const exported = await createProjectBundle({
      composition: bankedComposition(),
      store: source,
      mayEmbed: () => true,
    })
    const imported = await importProjectBundle(exported.bundle, {
      store: existing,
    })

    expect(imported.assets[0].status).toBe('already-present')
    expect(imported.playable).toBe(true)

    // The local naming and licence record survived the import untouched.
    const held = await existing.get(abcDigest)
    expect(held?.metadata.name).toBe('My Own Piano')
    expect(held?.metadata.license).toBe('Personal copy')
  })

  it('refuses embedded bytes that do not match their declared digest', async () => {
    const store = await stockedStore()
    const exported = await createProjectBundle({
      composition: bankedComposition(),
      store,
      mayEmbed: () => true,
    })

    // Tamper with the payload while leaving the digest claim in place.
    const tampered: ProjectBundle = {
      ...exported.bundle,
      assets: exported.bundle.assets.map((asset) => ({
        ...asset,
        bytes: encodeBase64(new TextEncoder().encode('xyz').buffer),
      })),
    }

    const clean = freshStore()
    const imported = await importProjectBundle(tampered, { store: clean })

    expect(imported.assets[0].status).toBe('digest-mismatch')
    expect(imported.playable).toBe(false)
    // Nothing was written.
    expect(await clean.get(abcDigest)).toBeUndefined()
  })

  it('flags a bundle whose asset digest contradicts its Composition', async () => {
    const store = await stockedStore()
    const exported = await createProjectBundle({
      composition: bankedComposition(),
      store,
      mayEmbed: () => true,
    })
    const conflicting: ProjectBundle = {
      ...exported.bundle,
      assets: exported.bundle.assets.map((asset) => ({
        ...asset,
        digest: 'a'.repeat(64),
      })),
    }

    const imported = await importProjectBundle(conflicting, {
      store: freshStore(),
    })
    expect(imported.assets[0].status).toBe('conflict')
    expect(imported.missingDigests).toContain(abcDigest)
    expect(imported.playable).toBe(false)
  })

  it('reports a referenced bank the manifest omitted entirely', async () => {
    const store = await stockedStore()
    const exported = await createProjectBundle({
      composition: bankedComposition(),
      store,
      mayEmbed: () => true,
    })
    const stripped: ProjectBundle = { ...exported.bundle, assets: [] }

    const imported = await importProjectBundle(stripped, { store: freshStore() })
    expect(imported.assets).toHaveLength(1)
    expect(imported.assets[0].status).toBe('missing')
    expect(imported.assets[0].message).toMatch(/absent from the bundle manifest/)
    expect(imported.playable).toBe(false)
  })

  it('imports a bank-free Composition with nothing to resolve', async () => {
    const composition = structuredClone(defaultComposition) as Composition
    // The default Composition now ships with the bundled bank referenced, so
    // a genuinely bank-free document has to be made explicitly.
    composition.soundBanks = []
    const exported = await createProjectBundle({ composition })
    const imported = await importProjectBundle(exported.bundle)

    expect(exported.bundle.assets).toEqual([])
    expect(imported.playable).toBe(true)
    expect(imported.missingDigests).toEqual([])
  })
})
