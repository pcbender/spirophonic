import { describe, expect, it, vi } from 'vitest'

import type {
  SoundBankReference,
  SoundFontInstrumentSpec,
} from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'
import type { SoundBankStore } from './soundbankStore'
import {
  SoundFontEngine,
  soundFontBankNumber,
  type SoundFontPreset,
  type SoundFontSynthesizer,
} from './soundfontEngine'

const bankBytes = () => {
  const bytes = new Uint8Array(12)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  bytes.set(new TextEncoder().encode('sfbk'), 8)
  return bytes.buffer
}

const reference = (id: string, digest = id.padEnd(64, 'a')): SoundBankReference => ({
  id,
  name: id,
  digest,
  format: 'sf2',
  source: 'local',
  license: 'User supplied',
  attribution: 'Test fixture',
})

const presets: Array<SoundFontPreset> = [
  { name: 'Grand Piano', bankMSB: 0, bankLSB: 0, program: 0, isDrum: false },
  { name: 'Strings', bankMSB: 0, bankLSB: 0, program: 48, isDrum: false },
  { name: 'Standard Kit', bankMSB: 120, bankLSB: 0, program: 0, isDrum: true },
]

const instrument = (
  id: string,
  soundBankId: string,
  preset: SoundFontPreset,
): SoundFontInstrumentSpec => ({
  id,
  name: preset.name,
  kind: 'soundfont',
  gain: id === 'piano' ? 0.7 : 0.5,
  pan: id === 'piano' ? -0.4 : 0.4,
  soundBankId,
  bank: soundFontBankNumber(preset),
  program: preset.program,
  presetName: preset.name,
  percussion: preset.isDrum,
  reverb: 0.25,
  chorus: 0.5,
})

const event = (
  id: string,
  instrumentId: string,
  midiNote: number,
): NoteMusicalEvent => ({
  id,
  sourceEncounterId: `encounter-${id}`,
  partId: `part-${id}`,
  instrumentId,
  kind: 'note',
  timeSeconds: 0,
  absoluteBeat: 0,
  barIndex: 0,
  beatInBar: 0,
  barPhase: 0,
  midiNote,
  frequencyHz: 440,
  velocity: id === 'one' ? 91 : 117,
  durationBeats: 1,
  durationSeconds: id === 'one' ? 0.4 : 0.7,
  rest: false,
  probability: 1,
})

class FakeContext {
  currentTime = 10
  state: AudioContextState = 'suspended'
  resumeCount = 0
  suspendCount = 0
  closeCount = 0

  async resume() {
    this.resumeCount += 1
    this.state = 'running'
  }

  async suspend() {
    this.suspendCount += 1
    this.state = 'suspended'
  }

  async close() {
    this.closeCount += 1
    this.state = 'closed'
  }
}

type RecordedCall = { channel: number; values: Array<number>; time?: number }

class FakeSynth implements SoundFontSynthesizer {
  readonly isReady = Promise.resolve()
  readonly presetList = presets
  readonly channelCalls = Array.from({ length: 16 }, () => ({
    drums: [] as Array<boolean>,
    parameters: [] as Array<{ name: string; value: number }>,
  }))
  readonly midiChannels = this.channelCalls.map((calls) => ({
    setDrums: (isDrum: boolean) => calls.drums.push(isDrum),
    setSystemParameter: (name: 'gain' | 'pan', value: number) =>
      calls.parameters.push({ name, value }),
  }))
  readonly bankAdds: Array<{ bytes: number; id: string }> = []
  readonly noteOns: Array<RecordedCall> = []
  readonly noteOffs: Array<RecordedCall> = []
  readonly controllers: Array<RecordedCall> = []
  readonly programs: Array<RecordedCall> = []
  stopCount = 0
  destroyCount = 0
  private readonly context: FakeContext

  constructor(context: FakeContext) {
    this.context = context
  }

  get currentTime() {
    return this.context.currentTime
  }

  readonly soundBankManager = {
    addSoundBank: async (bytes: ArrayBuffer, id: string) => {
      this.bankAdds.push({ bytes: bytes.byteLength, id })
    },
  }

  noteOn(channel: number, note: number, velocity: number, options?: { time?: number }) {
    this.noteOns.push({ channel, values: [note, velocity], time: options?.time })
  }

  noteOff(channel: number, note: number, options?: { time?: number }) {
    this.noteOffs.push({ channel, values: [note], time: options?.time })
  }

  controllerChange(channel: number, controller: number, value: number, options?: { time?: number }) {
    this.controllers.push({ channel, values: [controller, value], time: options?.time })
  }

  programChange(channel: number, program: number, options?: { time?: number }) {
    this.programs.push({ channel, values: [program], time: options?.time })
  }

  readonly pitchWheels: Array<RecordedCall> = []

  pitchWheel(channel: number, value: number, options?: { time?: number }) {
    this.pitchWheels.push({ channel, values: [value], time: options?.time })
  }

  stopAll() {
    this.stopCount += 1
  }

  destroy() {
    this.destroyCount += 1
  }
}

const harness = (availableDigests: ReadonlySet<string>, maxVoices = 64) => {
  const context = new FakeContext()
  const synths: Array<FakeSynth> = []
  const store = {
    get: vi.fn(async (digest: string) =>
      availableDigests.has(digest)
        ? {
            metadata: {
              digest,
              name: 'Fixture',
              format: 'sf2',
              byteLength: 12,
              license: 'Fixture',
              attribution: '',
              importedAt: '2026-08-05T00:00:00.000Z',
            },
            bytes: bankBytes(),
          }
        : undefined,
    ),
  } as unknown as SoundBankStore
  const engine = new SoundFontEngine({
    store,
    contextFactory: () => context as unknown as AudioContext,
    registerWorklet: vi.fn(async () => undefined),
    synthesizerFactory: () => {
      const synth = new FakeSynth(context)
      synths.push(synth)
      return synth
    },
    maxVoices,
  })
  return { context, engine, store, synths }
}

describe('SoundFontEngine', () => {
  it('preloads once and routes concurrent presets, drums, dynamics, and timing', async () => {
    const bank = reference('bank-one')
    const { engine, store, synths } = harness(new Set([bank.digest]))
    const piano = instrument('piano', bank.id, presets[0])
    const strings = instrument('strings', bank.id, presets[1])
    const drums = instrument('drums', bank.id, presets[2])

    const report = await engine.prepare([bank], [strings, drums, piano])
    expect(report.issues).toEqual([])
    expect(report.readyInstrumentIds).toEqual(['drums', 'piano', 'strings'])
    expect(report.presetsByBankId[bank.id]).toHaveLength(3)
    expect(store.get).toHaveBeenCalledTimes(1)
    expect(synths).toHaveLength(1)

    await engine.resume()
    engine.schedule(event('one', piano.id, 60), piano, 10.2)
    engine.schedule(event('two', strings.id, 67), strings, 10.2)
    engine.schedule(event('three', drums.id, 36), drums, 10.25)

    const synth = synths[0]
    expect(synth.noteOns).toEqual([
      { channel: 1, values: [60, 91], time: 10.2 },
      { channel: 2, values: [67, 117], time: 10.2 },
      { channel: 0, values: [36, 117], time: 10.25 },
    ])
    expect(synth.noteOffs.map(({ channel }) => channel)).toEqual([1, 2, 0])
    expect(synth.noteOffs[0].time).toBeCloseTo(10.6)
    expect(synth.noteOffs[1].time).toBeCloseTo(10.9)
    expect(synth.noteOffs[2].time).toBeCloseTo(10.95)
    expect(synth.channelCalls[1]).toEqual({
      drums: [false],
      parameters: [
        { name: 'gain', value: 0.7 },
        { name: 'pan', value: -0.4 },
      ],
    })
    expect(synth.channelCalls[0].drums).toEqual([true])
    expect(synth.controllers).toContainEqual({
      channel: 1,
      values: [91, 32],
      time: 10.2,
    })
    expect(synth.controllers).toContainEqual({
      channel: 1,
      values: [93, 64],
      time: 10.2,
    })
    expect(synth.programs).toContainEqual({
      channel: 2,
      values: [48],
      time: 10.2,
    })
  })

  it('reports a missing bank per Instrument while keeping another bank ready', async () => {
    const readyBank = reference('ready-bank')
    const missingBank = reference('missing-bank')
    const { engine } = harness(new Set([readyBank.digest]))
    const ready = instrument('ready', readyBank.id, presets[0])
    const missing = instrument('missing', missingBank.id, presets[1])

    const report = await engine.prepare(
      [readyBank, missingBank],
      [missing, ready],
    )

    expect(report.readyInstrumentIds).toEqual(['ready'])
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: 'bank-bytes-missing',
        instrumentId: 'missing',
        message: expect.stringContaining('Relink'),
      }),
    ])
    expect(engine.isInstrumentReady('ready')).toBe(true)
    expect(engine.isInstrumentReady('missing')).toBe(false)
    expect(engine.statusFor(missingBank.id)).toMatchObject({ state: 'missing' })
  })

  it('auditions a preset, steals beyond the configured voice limit, and disposes', async () => {
    const bank = reference('bank-one')
    const { context, engine, synths } = harness(new Set([bank.digest]), 1)
    const piano = instrument('piano', bank.id, presets[0])
    await engine.prepare([bank], [piano])

    await engine.audition(bank, presets[1], 72, 0.3)
    expect(synths[0].noteOns.at(-1)).toEqual({
      channel: 15,
      values: [72, 105],
      time: 10.05,
    })
    engine.schedule(event('one', piano.id, 60), piano, 10.2)
    engine.schedule(event('two', piano.id, 64), piano, 10.3)
    expect(synths[0].noteOffs).toContainEqual({
      channel: 0,
      values: [60],
      time: 10.3,
    })

    await engine.dispose()
    expect(synths[0].stopCount).toBeGreaterThan(0)
    expect(synths[0].destroyCount).toBe(1)
    expect(context.closeCount).toBe(1)
  })

  it('cancels only the voices that begin at or after the cut', async () => {
    const bank = reference('bank-one')
    const { engine, synths } = harness(new Set([bank.digest]))
    const piano = instrument('piano', bank.id, presets[0])
    await engine.prepare([bank], [piano])

    engine.schedule(event('one', piano.id, 60), piano, 10.0)
    engine.schedule(event('two', piano.id, 64), piano, 10.5)
    const releasesBefore = synths[0].noteOffs.length

    engine.cancelScheduledFrom(10.4)

    // Only the note starting at 10.5 is released, and never before its own
    // note-on. The note already sounding since 10.0 keeps ringing.
    const added = synths[0].noteOffs.slice(releasesBefore)
    expect(added).toEqual([{ channel: 0, values: [64], time: 10.5 }])
    expect(synths[0].stopCount).toBe(0)
  })

  it('keeps existing routes ready while prepare resolves an added bank', async () => {
    const warmBank = reference('warm-bank')
    const coldBank = reference('cold-bank')
    const { engine } = harness(new Set([warmBank.digest, coldBank.digest]))
    const warm = instrument('warm', warmBank.id, presets[0])
    const cold = instrument('cold', coldBank.id, presets[1])

    await engine.prepare([warmBank], [warm])
    expect(engine.isInstrumentReady('warm')).toBe(true)

    // Adding a second SoundFont Instrument mid-playback re-runs prepare. The
    // already-playing route must stay ready across the new bank's load.
    const readiness: Array<boolean> = []
    const inFlight = engine.prepare([warmBank, coldBank], [warm, cold])
    readiness.push(engine.isInstrumentReady('warm'))
    await Promise.resolve()
    readiness.push(engine.isInstrumentReady('warm'))
    await inFlight

    expect(readiness).toEqual([true, true])
    expect(engine.isInstrumentReady('warm')).toBe(true)
    expect(engine.isInstrumentReady('cold')).toBe(true)
  })

  it('bends pitch for exact frequencies and stays centred on whole semitones', async () => {
    const bank = reference('bank-one')
    const { engine, synths } = harness(new Set([bank.digest]))
    const piano = instrument('piano', bank.id, presets[0])
    await engine.prepare([bank], [piano])

    // A whole semitone needs no bend: the wheel stays at centre.
    engine.schedule(
      { ...event('one', piano.id, 60), midiNote: 60, frequencyHz: 261.6255653 },
      piano,
      10,
    )
    expect(synths[0].pitchWheels.at(-1)?.values[0]).toBe(8192)

    // A quarter tone up is half of the default 2-semitone range.
    engine.schedule(
      {
        ...event('two', piano.id, 60),
        midiNote: 60.5,
        frequencyHz: 269.2917795,
      },
      piano,
      10.5,
    )
    const bent = synths[0].pitchWheels.at(-1)
    expect(bent?.time).toBe(10.5)
    // 60.5 rounds to note 61, so the exact pitch is reached by bending *down*
    // a quarter of the 2-semitone range rather than up from note 60.
    expect(synths[0].noteOns.at(-1)?.values[0]).toBe(61)
    expect(bent?.values[0]).toBe(8192 - Math.round(0.25 * 8191))

    // Beyond the configured range the bend would wrap, so it stays centred
    // rather than sounding at a wrong pitch.
    engine.schedule(
      { ...event('three', piano.id, 60), midiNote: 60.5, frequencyHz: 269.29 },
      piano,
      11,
    )
    const outOfRange = harness(new Set([bank.digest]))
    const narrow = new SoundFontEngine({
      store: outOfRange.store,
      contextFactory: () => outOfRange.context as unknown as AudioContext,
      registerWorklet: vi.fn(async () => undefined),
      synthesizerFactory: () => {
        const synth = new FakeSynth(outOfRange.context)
        outOfRange.synths.push(synth)
        return synth
      },
      pitchBendRangeSemitones: 0.25,
    })
    await narrow.prepare([bank], [piano])
    narrow.schedule(
      { ...event('four', piano.id, 60), midiNote: 60.5, frequencyHz: 269.29 },
      piano,
      12,
    )
    expect(outOfRange.synths[0].pitchWheels.at(-1)?.values[0]).toBe(8192)
  })

  it('reports unsupported bank formats without opening a silent route', async () => {
    const bank = { ...reference('bank-dls'), format: 'dls' as const }
    const { engine } = harness(new Set([bank.digest]))
    const piano = instrument('piano', bank.id, presets[0])

    const report = await engine.prepare([bank], [piano])

    expect(report.readyInstrumentIds).toEqual([])
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: 'bank-unsupported',
        message: expect.stringContaining('accepts SF2 and SF3'),
      }),
    ])
    expect(engine.statusFor(bank.id)).toMatchObject({ state: 'unsupported' })
  })
})
