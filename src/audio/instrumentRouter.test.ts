import { describe, expect, it } from 'vitest'

import type {
  InstrumentSpec,
  SoundBankReference,
  SoundFontInstrumentSpec,
} from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'
import type {
  InstrumentEngine,
  ScheduledModulationLane,
} from './instrumentEngine'
import {
  InstrumentRouter,
  type SoundFontRouteEngine,
} from './instrumentRouter'
import type { SoundFontPreparation, SoundFontPreset } from './soundfontEngine'

const event = (instrumentId: string): NoteMusicalEvent => ({
  id: `event-${instrumentId}`,
  sourceEncounterId: 'encounter',
  partId: `part-${instrumentId}`,
  instrumentId,
  kind: 'note',
  timeSeconds: 0,
  absoluteBeat: 0,
  barIndex: 0,
  beatInBar: 0,
  barPhase: 0,
  midiNote: 60,
  frequencyHz: 261.625,
  velocity: 100,
  durationBeats: 1,
  durationSeconds: 0.5,
  rest: false,
  probability: 1,
})

const native: InstrumentSpec = {
  id: 'native',
  name: 'Native',
  kind: 'native-synth',
  gain: 1,
  pan: 0,
  waveform: 'sine',
  envelope: {
    attackSeconds: 0.01,
    decaySeconds: 0.1,
    sustain: 0.7,
    releaseSeconds: 0.2,
  },
}

const soundfont = (id: string): SoundFontInstrumentSpec => ({
  id,
  name: id,
  kind: 'soundfont',
  gain: 1,
  pan: 0,
  soundBankId: 'bank',
  bank: 0,
  program: 0,
  presetName: 'Grand Piano',
  percussion: false,
  reverb: 0,
  chorus: 0,
})

class FakeEngine implements InstrumentEngine {
  currentTimeSeconds: number
  readonly scheduled: Array<{
    id: string
    at: number
    laneTimes?: ReadonlyArray<number>
  }> = []
  cancelAt: Array<number> = []
  panicAt: Array<number> = []
  resumeCount = 0
  suspendCount = 0
  disposeCount = 0

  constructor(currentTime: number) {
    this.currentTimeSeconds = currentTime
  }

  async resume() {
    this.resumeCount += 1
  }

  async suspend() {
    this.suspendCount += 1
  }

  schedule(
    event: NoteMusicalEvent,
    _instrument: InstrumentSpec,
    at: number,
    lanes: ReadonlyArray<ScheduledModulationLane> = [],
  ) {
    this.scheduled.push({
      id: event.instrumentId,
      at,
      ...(lanes.length > 0
        ? { laneTimes: lanes[0].samples.map((sample) => sample.audioTimeSeconds) }
        : {}),
    })
  }

  cancelScheduledFrom(at: number) {
    this.cancelAt.push(at)
  }

  panic(at: number) {
    this.panicAt.push(at)
  }

  async dispose() {
    this.disposeCount += 1
  }
}

class FakeSoundFontEngine extends FakeEngine implements SoundFontRouteEngine {
  readonly ready = new Set<string>()
  readonly auditions: Array<{
    note: number
    durationSeconds?: number
    oneShot?: boolean
  }> = []
  report: SoundFontPreparation = {
    readyInstrumentIds: [],
    issues: [],
    presetsByBankId: {},
  }

  async prepare(
    _references: ReadonlyArray<SoundBankReference>,
    instruments: ReadonlyArray<SoundFontInstrumentSpec>,
  ) {
    for (const instrument of instruments) {
      if (instrument.id !== 'missing') this.ready.add(instrument.id)
    }
    this.report = {
      readyInstrumentIds: [...this.ready],
      issues: instruments
        .filter((instrument) => instrument.id === 'missing')
        .map((instrument) => ({
          code: 'bank-bytes-missing' as const,
          instrumentId: instrument.id,
          soundBankId: instrument.soundBankId,
          message: 'Relink the missing bank.',
        })),
      presetsByBankId: {},
    }
    return this.report
  }

  isInstrumentReady(instrumentId: string) {
    return this.ready.has(instrumentId)
  }

  async inspectBank() {
    return []
  }

  async audition(
    _reference: SoundBankReference,
    _preset: SoundFontPreset,
    note: number,
    durationSeconds?: number,
    oneShot?: boolean,
  ) {
    this.auditions.push({ note, durationSeconds, oneShot })
  }

  invalidateBank() {}
}

describe('InstrumentRouter', () => {
  it('forwards one-shot preview intent to the reserved SoundFont route', async () => {
    const soundFontEngine = new FakeSoundFontEngine(10)
    const router = new InstrumentRouter({
      nativeEngine: new FakeEngine(3),
      soundFontEngine,
    })
    const reference: SoundBankReference = {
      id: 'bank',
      name: 'Bank',
      digest: 'a'.repeat(64),
      format: 'sf3',
      source: 'local',
      license: 'Test',
      attribution: '',
    }
    const preset: SoundFontPreset = {
      name: 'Drum Samples',
      bankMSB: 0,
      bankLSB: 0,
      program: 0,
      isDrum: false,
    }

    await router.audition(reference, preset, 36, true)

    expect(soundFontEngine.auditions).toEqual([
      { note: 36, durationSeconds: undefined, oneShot: true },
    ])
  })

  it('routes native and concurrent SoundFont instruments on aligned clocks', async () => {
    const nativeEngine = new FakeEngine(3)
    const soundFontEngine = new FakeSoundFontEngine(10)
    const router = new InstrumentRouter({ nativeEngine, soundFontEngine })
    const piano = soundfont('piano')
    const strings = soundfont('strings')

    const report = await router.prepare([], [native, strings, piano])
    expect(report.readyInstrumentIds).toEqual(['strings', 'piano'])
    await router.resume()
    router.schedule(event(native.id), native, 10.5)
    router.schedule(event(piano.id), piano, 10.5)
    router.schedule(event(strings.id), strings, 10.5)

    expect(nativeEngine.scheduled).toEqual([{ id: 'native', at: 3.5 }])
    expect(soundFontEngine.scheduled).toEqual([
      { id: 'piano', at: 10.5 },
      { id: 'strings', at: 10.5 },
    ])
    expect(nativeEngine.resumeCount).toBe(1)
    expect(soundFontEngine.resumeCount).toBe(1)
  })

  it('translates note and modulation clocks together for the selected backend', async () => {
    const nativeEngine = new FakeEngine(3)
    const soundFontEngine = new FakeSoundFontEngine(10)
    const router = new InstrumentRouter({ nativeEngine, soundFontEngine })
    const note = event(native.id)
    const lane: ScheduledModulationLane = {
      id: 'lane-gain',
      mappingId: 'mapping-gain',
      noteEventId: note.id,
      partId: note.partId,
      instrumentId: note.instrumentId,
      target: 'gain',
      minimum: 0,
      maximum: 1,
      entryOnly: false,
      samples: [
        { audioTimeSeconds: 10.5, value: 0.2 },
        { audioTimeSeconds: 10.7, value: 0.8 },
      ],
    }

    router.schedule(note, native, 10.5, [lane])

    expect(nativeEngine.scheduled).toHaveLength(1)
    expect(nativeEngine.scheduled[0]).toMatchObject({ id: 'native', at: 3.5 })
    expect(nativeEngine.scheduled[0].laneTimes?.[0]).toBeCloseTo(3.5)
    expect(nativeEngine.scheduled[0].laneTimes?.[1]).toBeCloseTo(3.7)
  })

  it('drops only a visibly failed SoundFont route and keeps native playback', async () => {
    const nativeEngine = new FakeEngine(2)
    const soundFontEngine = new FakeSoundFontEngine(2)
    const router = new InstrumentRouter({ nativeEngine, soundFontEngine })
    const missing = soundfont('missing')
    const report = await router.prepare([], [native, missing])

    expect(report.issues).toEqual([
      expect.objectContaining({
        instrumentId: 'missing',
        message: 'Relink the missing bank.',
      }),
    ])
    router.schedule(event(missing.id), missing, 2.2)
    router.schedule(event(native.id), native, 2.2)
    expect(soundFontEngine.scheduled).toEqual([])
    expect(nativeEngine.scheduled).toEqual([{ id: 'native', at: 2.2 }])

    router.cancelScheduledFrom(2.4)
    router.panic(2.5)
    await router.suspend()
    await router.dispose()
    expect(nativeEngine.cancelAt).toEqual([2.4])
    expect(soundFontEngine.cancelAt).toEqual([2.4])
    expect(nativeEngine.disposeCount).toBe(1)
    expect(soundFontEngine.disposeCount).toBe(1)
  })
})
