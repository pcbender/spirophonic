import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'

import { sampleSoundBankBytes } from '../test/fixtures/compositions'
import {
  bundledSoundBank,
  bundledSoundBankPath,
  ensureBundledSoundBank,
} from './bundledSoundBank'
import { sha256Hex, SoundBankStore } from './soundbankStore'

let databaseCounter = 0
const freshVault = () =>
  new SoundBankStore({
    indexedDB: new IDBFactory(),
    databaseName: `bundled-${(databaseCounter += 1)}`,
  })

/**
 * The real bundled bank is 38 MB and lives in `public/`, so these tests stand a
 * small generated SoundFont in for it. What is under test is the fetch, verify,
 * and store policy, which does not depend on which bytes arrive.
 */
const stubBankBytes = () => sampleSoundBankBytes()

const respondWith = (bytes: ArrayBuffer, ok = true, status = 200) =>
  vi.fn(async () =>
    ({
      ok,
      status,
      arrayBuffer: async () => bytes,
    }) as unknown as Response,
  )

describe('the bundled sound bank reference', () => {
  it('declares a SHA-256 digest, its licence, and its attribution', () => {
    expect(bundledSoundBank.digest).toMatch(/^[0-9a-f]{64}$/)
    expect(bundledSoundBank.format).toBe('sf3')
    expect(bundledSoundBank.source).toBe('bundled')
    expect(bundledSoundBank.license).toBe('MIT')
    // The licence requires the copyright notices to travel with the bank.
    expect(bundledSoundBank.attribution).toMatch(/Frank Wen/)
    expect(bundledSoundBank.attribution).toMatch(/Michael Cowgill/)
    expect(bundledSoundBank.attribution).toMatch(/S\. Christian Collins/)
  })
})

describe('ensureBundledSoundBank', () => {
  it('requests the bundled path and reports that it is fetching', async () => {
    // The success path cannot be exercised here: only the real 38 MB file
    // hashes to the declared digest, and it is deliberately not in the test
    // bundle. What is checked is that the fetch is issued against the right
    // URL, progress is reported, and anything that fails verification is
    // refused. A real download is covered in the browser suite.
    const vault = freshVault()
    const bytes = stubBankBytes()
    const digest = await sha256Hex(bytes)
    const fetchImpl = respondWith(bytes)
    const states: Array<string> = []

    const result = await ensureBundledSoundBank({
      store: vault,
      fetchImpl,
      onState: (state) => states.push(state.state),
    })

    expect(states).toContain('fetching')
    expect(fetchImpl).toHaveBeenCalledWith(
      `/${bundledSoundBankPath}`,
      expect.objectContaining({}),
    )
    // Correct bytes for a different bank are still the wrong bank.
    expect(result.state).toBe('failed')
    expect(await vault.get(digest)).toBeUndefined()
  })

  it('refuses bytes that do not match the declared digest', async () => {
    const vault = freshVault()
    const result = await ensureBundledSoundBank({
      store: vault,
      fetchImpl: respondWith(new TextEncoder().encode('not a bank').buffer),
    })

    expect(result.state).toBe('failed')
    if (result.state === 'failed') {
      expect(result.message).toMatch(/did not match its digest/)
    }
    expect(await vault.list()).toEqual([])
  })

  it('does no network work when the digest is already in the vault', async () => {
    const vault = freshVault()
    const bytes = stubBankBytes()
    await vault.importBank({
      bytes,
      name: 'Already Here',
      format: 'sf2',
      license: 'Apache-2.0',
    })
    const digest = await sha256Hex(bytes)

    // Point the check at the digest the vault actually holds.
    const fetchImpl = vi.fn()
    const store = {
      get: async (wanted: string) =>
        wanted === bundledSoundBank.digest
          ? await vault.get(digest)
          : undefined,
      importBank: vault.importBank.bind(vault),
    } as unknown as SoundBankStore

    const result = await ensureBundledSoundBank({ store, fetchImpl })

    expect(result.state).toBe('present')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports a failed download without throwing', async () => {
    const result = await ensureBundledSoundBank({
      store: freshVault(),
      fetchImpl: respondWith(new ArrayBuffer(0), false, 404),
    })

    expect(result.state).toBe('failed')
    if (result.state === 'failed') {
      expect(result.message).toMatch(/404/)
    }
  })

  it('reports a network error without throwing', async () => {
    const result = await ensureBundledSoundBank({
      store: freshVault(),
      fetchImpl: vi.fn(async () => {
        throw new Error('offline')
      }),
    })

    expect(result.state).toBe('failed')
    if (result.state === 'failed') expect(result.message).toMatch(/offline/)
  })

  it('treats an aborted fetch as idle rather than as a failure', async () => {
    const controller = new AbortController()
    controller.abort()

    const result = await ensureBundledSoundBank({
      store: freshVault(),
      signal: controller.signal,
      fetchImpl: vi.fn(async () => {
        throw new DOMException('aborted', 'AbortError')
      }),
    })

    // Navigating away is not an error worth showing anyone.
    expect(result.state).toBe('idle')
  })

  it('says so when the browser cannot fetch at all', async () => {
    // The parameter default falls back to the global, so the global is what
    // has to be removed to reach this branch.
    const held = globalThis.fetch
    // @ts-expect-error deliberately removing the global for this check
    delete globalThis.fetch
    try {
      const result = await ensureBundledSoundBank({ store: freshVault() })
      expect(result.state).toBe('failed')
      if (result.state === 'failed') {
        expect(result.message).toMatch(/cannot fetch/)
      }
    } finally {
      globalThis.fetch = held
    }
  })
})
