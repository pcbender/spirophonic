import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import type { Composition } from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import { exportCompositionToJson } from '../export/compositionJson'
import {
  SoundBankStore,
  SoundBankStoreError,
  sha256Hex,
  soundBankStoreErrorFor,
} from './soundbankStore'

const bankBytes = new TextEncoder().encode('abc').buffer
const digest =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

const digestBytes = (hex: string) =>
  Uint8Array.from(
    hex.match(/../g)!.map((pair) => Number.parseInt(pair, 16)),
  ).buffer

const subtleCrypto = {
  digest: async (_algorithm: AlgorithmIdentifier, data: BufferSource) => {
    const bytes = new Uint8Array(data as ArrayBuffer)
    return digestBytes(
      bytes.length === 3 && bytes[0] === 97 && bytes[1] === 98 && bytes[2] === 99
        ? digest
        : '01'.repeat(32),
    )
  },
} as unknown as SubtleCrypto

const storeFor = (
  indexedDB: IDBFactory,
  databaseName: string,
  options: Partial<ConstructorParameters<typeof SoundBankStore>[0]> = {},
) =>
  new SoundBankStore({
    databaseName,
    indexedDB,
    subtleCrypto,
    now: () => '2026-08-05T00:00:00.000Z',
    ...options,
  })

const input = (bytes: ArrayBuffer = bankBytes) => ({
  bytes,
  name: 'Test Bank',
  format: 'sf2' as const,
  license: 'User supplied',
  attribution: 'Local test fixture',
})

describe('SoundBankStore', () => {
  it('keys banks by SHA-256 and deduplicates the same bytes', async () => {
    const store = storeFor(new IDBFactory(), 'dedupe')

    const first = await store.importBank(input())
    const second = await store.importBank({
      ...input(),
      name: 'A duplicate filename.sf2',
    })

    expect(first).toEqual({
      created: true,
      metadata: expect.objectContaining({ digest, byteLength: 3 }),
    })
    expect(second).toEqual({ ...first, created: false })
    expect(await store.list()).toHaveLength(1)
  })

  it('survives a store reload and returns cloned bank bytes', async () => {
    const indexedDB = new IDBFactory()
    const first = storeFor(indexedDB, 'reload')
    await first.importBank(input())
    first.close()

    const reloaded = storeFor(indexedDB, 'reload')
    const stored = await reloaded.get(digest)
    expect(new Uint8Array(stored!.bytes)).toEqual(new Uint8Array(bankBytes))
    expect(stored!.bytes).not.toBe(bankBytes)
  })

  it('deletes bytes without mutating a Composition reference and can relink them', async () => {
    const store = storeFor(new IDBFactory(), 'relink')
    const imported = await store.importBank(input())
    const composition = structuredClone(defaultComposition) as Composition
    composition.soundBanks = [store.toReference('bank-1', imported.metadata)]
    const exported = JSON.parse(exportCompositionToJson(composition))

    expect(await store.delete(digest)).toBe(true)
    expect(await store.get(digest)).toBeUndefined()
    expect(composition.soundBanks[0].digest).toBe(digest)
    expect(exported.soundBanks[0]).not.toHaveProperty('bytes')

    await store.relink(digest, input())
    expect(await store.get(digest)).toBeDefined()
  })

  it('rejects a relink when the selected bytes do not match the reference', async () => {
    const store = storeFor(new IDBFactory(), 'mismatch')

    await expect(
      store.relink(digest, input(new Uint8Array([1, 2, 3]).buffer)),
    ).rejects.toMatchObject({ code: 'digest-mismatch' })
    expect(await store.list()).toEqual([])
  })

  it('preflights browser quota without penalizing a duplicate import', async () => {
    const indexedDB = new IDBFactory()
    let quota = 10
    const store = storeFor(indexedDB, 'quota', {
      estimateStorage: async () => ({ usage: 8, quota }),
    })

    await expect(store.importBank(input())).rejects.toMatchObject({
      code: 'quota-exceeded',
    })
    quota = 20
    await store.importBank(input())
    quota = 8
    await expect(store.importBank(input())).resolves.toMatchObject({
      created: false,
    })
  })

  it('surfaces missing browser APIs and maps quota exceptions', async () => {
    const store = new SoundBankStore({ indexedDB: null })

    await expect(store.list()).rejects.toMatchObject({ code: 'unavailable' })
    expect(
      soundBankStoreErrorFor(
        Object.assign(new Error('full'), { name: 'QuotaExceededError' }),
        'store a bank',
      ),
    ).toMatchObject({ code: 'quota-exceeded' })
  })
})

describe('sha256Hex', () => {
  it('produces the canonical lowercase digest', async () => {
    await expect(sha256Hex(bankBytes, subtleCrypto)).resolves.toBe(digest)
  })

  it('reports digest failures explicitly', async () => {
    const subtle = {
      digest: async () => {
        throw new Error('crypto failed')
      },
    } as unknown as SubtleCrypto

    await expect(sha256Hex(bankBytes, subtle)).rejects.toBeInstanceOf(
      SoundBankStoreError,
    )
  })
})
