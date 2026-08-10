import type {
  InstrumentSpec,
  SoundBankReference,
  SoundFontInstrumentSpec,
} from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'
import type { InstrumentEngine, ScheduledModulationLane } from './instrumentEngine'
import { NativeSynthEngine } from './nativeSynthEngine'
import type { SoundBankStore } from './soundbankStore'
import {
  SoundFontEngine,
  type SoundFontPreparation,
  type SoundFontPreset,
} from './soundfontEngine'

export type SoundFontRouteEngine = InstrumentEngine & {
  prepare: (
    references: ReadonlyArray<SoundBankReference>,
    instruments: ReadonlyArray<SoundFontInstrumentSpec>,
  ) => Promise<SoundFontPreparation>
  isInstrumentReady: (instrumentId: string) => boolean
  inspectBank: (
    reference: SoundBankReference,
  ) => Promise<ReadonlyArray<SoundFontPreset>>
  audition: (
    reference: SoundBankReference,
    preset: SoundFontPreset,
    note: number,
    durationSeconds?: number,
  ) => Promise<void>
  invalidateBank: (soundBankId: string) => void
}

export type InstrumentRouterOptions = Readonly<{
  store?: SoundBankStore
  nativeEngine?: InstrumentEngine
  soundFontEngine?: SoundFontRouteEngine
}>

const emptyPreparation: SoundFontPreparation = Object.freeze({
  readyInstrumentIds: Object.freeze([]),
  issues: Object.freeze([]),
  presetsByBankId: Object.freeze({}),
})

/** Routes one canonical performance across native and SoundFont backends. */
export class InstrumentRouter implements InstrumentEngine {
  private readonly nativeEngine: InstrumentEngine
  private readonly soundFontEngine: SoundFontRouteEngine
  private preparation: SoundFontPreparation = emptyPreparation
  private disposed = false

  constructor(options: InstrumentRouterOptions) {
    this.nativeEngine = options.nativeEngine ?? new NativeSynthEngine()
    if (options.soundFontEngine) {
      this.soundFontEngine = options.soundFontEngine
    } else if (options.store) {
      this.soundFontEngine = new SoundFontEngine({ store: options.store })
    } else {
      throw new TypeError(
        'InstrumentRouter requires a SoundBankStore or SoundFont engine.',
      )
    }
  }

  get currentTimeSeconds() {
    return Math.max(
      this.nativeEngine.currentTimeSeconds,
      this.soundFontEngine.currentTimeSeconds,
    )
  }

  get soundFontPreparation() {
    return this.preparation
  }

  async prepare(
    references: ReadonlyArray<SoundBankReference>,
    instruments: ReadonlyArray<InstrumentSpec>,
  ) {
    this.assertUsable()
    this.preparation = await this.soundFontEngine.prepare(
      references,
      instruments.filter(
        (instrument): instrument is SoundFontInstrumentSpec =>
          instrument.kind === 'soundfont',
      ),
    )
    return this.preparation
  }

  inspectBank(reference: SoundBankReference) {
    this.assertUsable()
    return this.soundFontEngine.inspectBank(reference)
  }

  audition(
    reference: SoundBankReference,
    preset: SoundFontPreset,
    note: number,
  ) {
    this.assertUsable()
    return this.soundFontEngine.audition(reference, preset, note)
  }

  invalidateBank(soundBankId: string) {
    this.soundFontEngine.invalidateBank(soundBankId)
  }

  async resume() {
    this.assertUsable()
    await Promise.all([
      this.nativeEngine.resume(),
      this.soundFontEngine.resume(),
    ])
  }

  async suspend() {
    await Promise.all([
      this.nativeEngine.suspend(),
      this.soundFontEngine.suspend(),
    ])
  }

  schedule(
    event: NoteMusicalEvent,
    instrument: InstrumentSpec,
    audioTimeSeconds: number,
    lanes: ReadonlyArray<ScheduledModulationLane> = [],
  ): unknown {
    this.assertUsable()
    const engine =
      instrument.kind === 'soundfont'
        ? this.soundFontEngine
        : this.nativeEngine
    if (
      instrument.kind === 'soundfont' &&
      !this.soundFontEngine.isInstrumentReady(instrument.id)
    ) {
      // prepare() has already returned a user-visible issue for this route.
      return Object.freeze([])
    }
    const translatedTime = this.translateTime(engine, audioTimeSeconds)
    return engine.schedule(
      event,
      instrument,
      translatedTime,
      lanes.map((lane) =>
        Object.freeze({
          ...lane,
          samples: Object.freeze(
            lane.samples.map((sample) =>
              Object.freeze({
                ...sample,
                audioTimeSeconds: this.translateTime(
                  engine,
                  sample.audioTimeSeconds,
                ),
              }),
            ),
          ),
        }),
      ),
    )
  }

  cancelScheduledFrom(audioTimeSeconds: number) {
    this.nativeEngine.cancelScheduledFrom(
      this.translateTime(this.nativeEngine, audioTimeSeconds),
    )
    this.soundFontEngine.cancelScheduledFrom(
      this.translateTime(this.soundFontEngine, audioTimeSeconds),
    )
  }

  panic(audioTimeSeconds: number) {
    this.nativeEngine.panic(
      this.translateTime(this.nativeEngine, audioTimeSeconds),
    )
    this.soundFontEngine.panic(
      this.translateTime(this.soundFontEngine, audioTimeSeconds),
    )
  }

  async dispose() {
    if (this.disposed) return
    this.disposed = true
    await Promise.all([
      this.nativeEngine.dispose(),
      this.soundFontEngine.dispose(),
    ])
  }

  private translateTime(engine: InstrumentEngine, routerTime: number) {
    return (
      engine.currentTimeSeconds +
      Math.max(0, routerTime - this.currentTimeSeconds)
    )
  }

  private assertUsable() {
    if (this.disposed) throw new Error('InstrumentRouter has been disposed.')
  }
}
