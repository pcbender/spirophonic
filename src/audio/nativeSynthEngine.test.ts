import { describe, expect, it, vi } from 'vitest'

import type {
  InstrumentSpec,
  NativeDrumInstrumentSpec,
  NativeSynthInstrumentSpec,
} from '../core/composition'
import type { NoteMusicalEvent } from '../core/performance'
import type { ScheduledAudioVoice } from './instrumentEngine'
import {
  NativeSynthEngine,
  type NativeDrumPlayer,
  type NativeTonePlayer,
} from './nativeSynthEngine'

class FakeAudioParam {
  value = 0
  readonly scheduled: Array<{ value: number; at: number }> = []

  setValueAtTime(value: number, at: number) {
    this.value = value
    this.scheduled.push({ value, at })
    return this
  }
}

class FakeNode {
  readonly connections: Array<unknown> = []
  disconnectCount = 0

  connect(destination: unknown) {
    this.connections.push(destination)
    return destination
  }

  disconnect() {
    this.disconnectCount += 1
  }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeAudioParam()
}

class FakePanner extends FakeNode {
  readonly pan = new FakeAudioParam()
}

class FakeAudioContext {
  currentTime = 0
  state: AudioContextState = 'suspended'
  readonly destination = new FakeNode()
  readonly gains: Array<FakeGain> = []
  readonly panners: Array<FakePanner> = []
  resumeCount = 0
  suspendCount = 0
  closeCount = 0

  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }

  createStereoPanner() {
    const panner = new FakePanner()
    this.panners.push(panner)
    return panner
  }

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

const synth = (
  id: string,
  waveform: NativeSynthInstrumentSpec['waveform'],
): NativeSynthInstrumentSpec => ({
  id,
  name: id,
  kind: 'native-synth',
  gain: id === 'synth-a' ? 0.7 : 0.4,
  pan: id === 'synth-a' ? -0.5 : 0.5,
  waveform,
  envelope: {
    attackSeconds: 0.01,
    decaySeconds: 0.1,
    sustain: 0.6,
    releaseSeconds: 0.2,
  },
})

const drum: NativeDrumInstrumentSpec = {
  id: 'drums',
  name: 'Drums',
  kind: 'native-drum',
  gain: 0.8,
  pan: 0,
  voice: 'snare',
}

const note = (id: string, instrumentId: string): NoteMusicalEvent =>
  Object.freeze({
    id,
    sourceEncounterId: `encounter-${id}`,
    partId: `part-${id}`,
    instrumentId,
    kind: 'note',
    timeSeconds: 0.2,
    absoluteBeat: 0.4,
    barIndex: 0,
    beatInBar: 0.4,
    barPhase: 0.1,
    midiNote: 60,
    frequencyHz: 261.625565,
    velocity: 100,
    durationBeats: 0.5,
    durationSeconds: 0.25,
    rest: false,
    probability: 1,
  })

type VoiceRecord = ScheduledAudioVoice & { cancelledAt: Array<number> }

const voice = (startsAtSeconds: number, endsAtSeconds: number): VoiceRecord => {
  const cancelledAt: Array<number> = []
  return {
    startsAtSeconds,
    endsAtSeconds,
    cancelledAt,
    cancel: (atSeconds) => cancelledAt.push(atSeconds),
  }
}

describe('NativeSynthEngine', () => {
  it('routes simultaneous Parts through their selected Instrument definitions', async () => {
    const context = new FakeAudioContext()
    const toneCalls: Array<{
      destination: AudioNode
      waveform: NativeSynthInstrumentSpec['waveform']
      atSeconds: number
      durationSeconds: number
      frequencyHz: number
    }> = []
    const drumCalls: Array<{
      destination: AudioNode
      voice: NativeDrumInstrumentSpec['voice']
      atSeconds: number
    }> = []
    const tonePlayer: NativeTonePlayer = (
      _context,
      destination,
      frequencyHz,
      atSeconds,
      durationSeconds,
      _level,
      waveform,
    ) => {
      toneCalls.push({
        destination,
        waveform,
        atSeconds,
        durationSeconds,
        frequencyHz,
      })
      return voice(atSeconds, atSeconds + durationSeconds)
    }
    const drumPlayer: NativeDrumPlayer = (
      _context,
      destination,
      selectedVoice,
      atSeconds,
    ) => {
      drumCalls.push({ destination, voice: selectedVoice, atSeconds })
      return voice(atSeconds, atSeconds + 0.2)
    }
    const engine = new NativeSynthEngine({
      contextFactory: () => context as unknown as AudioContext,
      tonePlayer,
      drumPlayer,
    })

    await engine.resume()
    engine.schedule(note('a', 'synth-a'), synth('synth-a', 'sine'), 0.5)
    engine.schedule(note('b', 'synth-b'), synth('synth-b', 'square'), 0.5)
    engine.schedule(note('d', 'drums'), drum, 0.5)

    expect(toneCalls).toMatchObject([
      {
        waveform: 'sine',
        atSeconds: 0.5,
        durationSeconds: 0.25,
        frequencyHz: 261.625565,
      },
      {
        waveform: 'square',
        atSeconds: 0.5,
        durationSeconds: 0.25,
        frequencyHz: 261.625565,
      },
    ])
    expect(toneCalls[0].destination).not.toBe(toneCalls[1].destination)
    expect(drumCalls).toMatchObject([{ voice: 'snare', atSeconds: 0.5 }])
    expect(context.gains.map(({ gain }) => gain.scheduled.at(-1)?.value)).toEqual([
      undefined,
      0.7,
      0.4,
      0.8,
    ])
    expect(context.panners.map(({ pan }) => pan.scheduled.at(-1)?.value)).toEqual([
      -0.5,
      0.5,
      0,
    ])
  })

  it('cancels future voices selectively and panic-cancels everything left', async () => {
    const context = new FakeAudioContext()
    const voices: Array<VoiceRecord> = []
    const tonePlayer: NativeTonePlayer = (
      _context,
      _destination,
      _frequencyHz,
      atSeconds,
      durationSeconds,
    ) => {
      const scheduled = voice(atSeconds, atSeconds + durationSeconds)
      voices.push(scheduled)
      return scheduled
    }
    const engine = new NativeSynthEngine({
      contextFactory: () => context as unknown as AudioContext,
      tonePlayer,
    })
    const instrument = synth('synth-a', 'triangle')
    await engine.resume()
    engine.schedule(note('one', 'synth-a'), instrument, 0.2)
    engine.schedule(note('two', 'synth-a'), instrument, 0.4)
    engine.schedule(note('three', 'synth-a'), instrument, 0.6)

    context.currentTime = 0.1
    engine.cancelScheduledFrom(0.5)
    expect(voices.map(({ cancelledAt }) => cancelledAt)).toEqual([[], [], [0.1]])

    engine.panic(0.15)
    expect(voices.map(({ cancelledAt }) => cancelledAt)).toEqual([
      [0.15],
      [0.15],
      [0.1],
    ])
  })

  it('owns AudioContext lifecycle and rejects deferred SoundFont routing', async () => {
    const context = new FakeAudioContext()
    const engine = new NativeSynthEngine({
      contextFactory: () => context as unknown as AudioContext,
      tonePlayer: vi.fn(),
    })
    const soundfont: InstrumentSpec = {
      id: 'piano',
      name: 'Piano',
      kind: 'soundfont',
      gain: 1,
      pan: 0,
      soundBankId: 'bank',
      bank: 0,
      program: 0,
      percussion: false,
      reverb: 0,
      chorus: 0,
    }

    expect(engine.currentTimeSeconds).toBe(0)
    await engine.resume()
    expect(context.resumeCount).toBe(1)
    await engine.suspend()
    expect(context.suspendCount).toBe(1)
    expect(() => engine.schedule(note('piano', 'piano'), soundfont, 1)).toThrow(
      'SoundFont engine planned for MG-11',
    )

    await engine.dispose()
    expect(context.closeCount).toBe(1)
    expect(() => engine.schedule(note('late', 'synth-a'), synth('synth-a', 'sine'), 1)).toThrow(
      'disposed',
    )
  })

  it('rejects accidental event-to-Instrument mismatches', () => {
    const engine = new NativeSynthEngine({
      contextFactory: () => new FakeAudioContext() as unknown as AudioContext,
    })

    expect(() => engine.schedule(note('bad', 'synth-a'), synth('synth-b', 'sine'), 0.2)).toThrow(
      'not synth-b',
    )
  })
})
