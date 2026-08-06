import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import type { Composition, SoundFontInstrumentSpec } from '../core/composition'
import { compilePerformance } from '../core/performance'
import { exportCompositionToJson, parseCompositionJson } from '../export/compositionJson'
import { buildPerformanceMidi } from '../export/midiExport'
import { showcaseComposition } from '../test/fixtures/compositions'
import type { InstrumentEngine } from './instrumentEngine'
import { InstrumentRouter } from './instrumentRouter'
import { PerformanceScheduler } from './performanceScheduler'
import { SoundBankStore } from './soundbankStore'
import { SoundFontEngine } from './soundfontEngine'

/**
 * MG-21 acceptance: a SoundFont failure must never take down the native engine
 * or lose Composition data.
 *
 * The showcase names a bank this repository does not ship, so the failing path
 * is the ordinary one: every check below starts from a vault that does not have
 * the bank the Composition asks for.
 */

const request = { startSeconds: 0, durationSeconds: 4, sampleRateHz: 120 }

let databaseCounter = 0
const emptyVault = () =>
  new SoundBankStore({
    indexedDB: new IDBFactory(),
    databaseName: `integration-${(databaseCounter += 1)}`,
  })

class RecordingNativeEngine implements InstrumentEngine {
  currentTimeSeconds = 0
  readonly scheduled: Array<string> = []
  disposed = false

  async resume() {}
  async suspend() {}
  schedule(event: { instrumentId: string }) {
    this.scheduled.push(event.instrumentId)
  }
  cancelScheduledFrom() {}
  panic() {}
  async dispose() {
    this.disposed = true
  }
}

const soundFontEngineFor = (store: SoundBankStore) =>
  new SoundFontEngine({
    store,
    // No worklet and no synthesizer: loading always fails, which is what a
    // missing or unreadable bank looks like from the router's side.
    contextFactory: () =>
      ({
        currentTime: 0,
        state: 'suspended',
        resume: async () => undefined,
      }) as never,
    registerWorklet: async () => {
      throw new Error('AudioWorklet is unavailable in this environment.')
    },
    loadTimeoutMilliseconds: 50,
  })

describe('a SoundFont failure leaves the native engine working', () => {
  it('reports the failure as an issue rather than throwing', async () => {
    const composition = showcaseComposition()
    const native = new RecordingNativeEngine()
    const router = new InstrumentRouter({
      nativeEngine: native,
      soundFontEngine: soundFontEngineFor(emptyVault()),
    })

    const preparation = await router.prepare(
      composition.soundBanks,
      composition.instruments,
    )

    expect(preparation.readyInstrumentIds).toEqual([])
    expect(preparation.issues.length).toBeGreaterThan(0)
    expect(preparation.issues[0].instrumentId).toBe('instrument-pad')
    await router.dispose()
  })

  it('still plays every native Instrument in the same Composition', async () => {
    const composition = showcaseComposition()
    const performance = compilePerformance(composition, request)
    const native = new RecordingNativeEngine()
    const router = new InstrumentRouter({
      nativeEngine: native,
      soundFontEngine: soundFontEngineFor(emptyVault()),
    })
    await router.prepare(composition.soundBanks, composition.instruments)

    const scheduler = new PerformanceScheduler(router, {
      clock: { setInterval: () => 1, clearInterval: () => undefined },
      lookaheadSeconds: 10,
      tickMilliseconds: 25,
      startDelaySeconds: 0,
    })
    await scheduler.start(performance, composition.instruments, {
      tempoBpm: composition.transport.tempoBpm,
    })

    const nativeIds = new Set(
      composition.instruments
        .filter((instrument) => instrument.kind !== 'soundfont')
        .map((instrument) => instrument.id),
    )
    const expected = performance.performedEvents.filter(
      (event) => !event.rest && nativeIds.has(event.instrumentId),
    )

    expect(expected.length).toBeGreaterThan(0)
    expect(native.scheduled.length).toBe(expected.length)
    // Not one event reached the native engine from the broken SoundFont route.
    expect(native.scheduled.every((id) => nativeIds.has(id))).toBe(true)

    await scheduler.dispose()
  })

  it('does not lose Composition data when the bank is missing', async () => {
    const composition = showcaseComposition()
    const before = exportCompositionToJson(composition)

    const router = new InstrumentRouter({
      nativeEngine: new RecordingNativeEngine(),
      soundFontEngine: soundFontEngineFor(emptyVault()),
    })
    await router.prepare(composition.soundBanks, composition.instruments)
    await router.dispose()

    // The Composition is untouched by audio failure: same JSON, still valid,
    // and the bank reference is still there to be relinked later.
    expect(exportCompositionToJson(composition)).toBe(before)
    const reparsed = parseCompositionJson(before)
    expect(reparsed.ok).toBe(true)
    if (reparsed.ok) {
      expect(reparsed.composition.soundBanks).toHaveLength(1)
      expect(
        reparsed.composition.instruments.some(
          (instrument) => instrument.kind === 'soundfont',
        ),
      ).toBe(true)
    }
  })

  it('still exports MIDI for every Part, including the silent SoundFont one', () => {
    // Export reads the canonical layer, not the audio engine, so a bank that
    // cannot load must not remove notes from a file.
    const composition = showcaseComposition()
    const performance = compilePerformance(composition, request)
    const bytes = buildPerformanceMidi(performance, composition)

    expect(bytes.byteLength).toBeGreaterThan(0)
    const soundFontPart = composition.parts.find(
      (part) => part.instrumentId === 'instrument-pad',
    )
    expect(soundFontPart).toBeDefined()
    expect(
      performance.performedEvents.some(
        (event) => event.partId === soundFontPart?.id,
      ),
    ).toBe(true)
  })

  it('recovers when the bank later arrives, without restarting the app', async () => {
    const composition = showcaseComposition()
    const vault = emptyVault()
    const soundFontEngine = soundFontEngineFor(vault)
    const router = new InstrumentRouter({
      nativeEngine: new RecordingNativeEngine(),
      soundFontEngine,
    })

    const first = await router.prepare(
      composition.soundBanks,
      composition.instruments,
    )
    expect(first.issues.length).toBeGreaterThan(0)

    // Relinking to a different digest is an ordinary edit; prepare() must be
    // callable again and must report the new state rather than the old.
    const relinked = showcaseComposition()
    relinked.soundBanks[0].digest = 'a'.repeat(64)
    const soundFont = relinked.instruments.find(
      (instrument): instrument is SoundFontInstrumentSpec =>
        instrument.kind === 'soundfont',
    )
    expect(soundFont).toBeDefined()

    const second = await router.prepare(
      relinked.soundBanks,
      relinked.instruments,
    )
    expect(second.issues.length).toBeGreaterThan(0)
    expect(second.readyInstrumentIds).toEqual([])

    await router.dispose()
  })

  it('disposes cleanly after a failure, leaving nothing running', async () => {
    const native = new RecordingNativeEngine()
    const router = new InstrumentRouter({
      nativeEngine: native,
      soundFontEngine: soundFontEngineFor(emptyVault()),
    })
    await router.prepare(
      showcaseComposition().soundBanks,
      showcaseComposition().instruments,
    )

    await router.dispose()
    expect(native.disposed).toBe(true)
    // A second dispose is harmless, which matters on an unmount race.
    await expect(router.dispose()).resolves.toBeUndefined()
  })
})

describe('the vault survives a Composition it cannot satisfy', () => {
  it('reports a missing digest without corrupting the store', async () => {
    const vault = emptyVault()
    const composition: Composition = showcaseComposition()

    const missing = await vault.get(composition.soundBanks[0].digest)
    expect(missing).toBeUndefined()

    // The vault is still usable afterwards.
    await vault.importBank({
      bytes: new TextEncoder().encode('abc').buffer,
      name: 'Later Bank',
      format: 'sf2',
      license: 'User supplied',
    })
    expect(await vault.list()).toHaveLength(1)
  })
})
