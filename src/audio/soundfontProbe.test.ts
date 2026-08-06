import { describe, expect, it } from 'vitest'

import {
  runSoundFontProbe,
  soundBankContainerKind,
  type SoundFontProbeBackend,
  type SoundFontProbeNote,
  type SoundFontProbePreset,
} from './soundfontProbe'

const presets: Array<SoundFontProbePreset> = [
  {
    name: 'Piano',
    program: 0,
    bankMSB: 0,
    bankLSB: 0,
    isDrum: false,
  },
  {
    name: 'Strings',
    program: 48,
    bankMSB: 0,
    bankLSB: 0,
    isDrum: false,
  },
  {
    name: 'Standard Kit',
    program: 0,
    bankMSB: 0,
    bankLSB: 0,
    isDrum: true,
  },
]

class FakeProbeBackend implements SoundFontProbeBackend {
  readonly availablePresets: Array<SoundFontProbePreset>
  loaded = false
  disposed = false
  scheduled: Array<SoundFontProbeNote> = []
  memoryRead = 0

  constructor(availablePresets = presets) {
    this.availablePresets = availablePresets
  }

  async initialize() {}

  async loadBank(bytes: ArrayBuffer) {
    if (bytes.byteLength === 4) throw new Error('invalid RIFF')
    this.loaded = true
    return this.availablePresets
  }

  currentTime() {
    return 10
  }

  async schedule(notes: ReadonlyArray<SoundFontProbeNote>) {
    if (!this.loaded) throw new Error('missing bank')
    this.scheduled = [...notes]
  }

  memoryBytes() {
    this.memoryRead += 1
    return this.memoryRead === 1 ? 1_000 : 1_600
  }

  async dispose() {
    this.disposed = true
  }
}

describe('runSoundFontProbe', () => {
  it('measures initialization/load and schedules two overlapping presets plus drums', async () => {
    const backend = new FakeProbeBackend()
    let clock = 0
    let waited = 0

    const result = await runSoundFontProbe(
      {
        bytes: new Uint8Array([1, 2, 3]).buffer,
        format: 'sf3',
        label: 'Fixture',
      },
      {
        backend,
        now: () => (clock += 5),
        digest: async () => 'fixture-digest',
        wait: async (milliseconds) => {
          waited = milliseconds
        },
      },
    )

    expect(result.bank).toMatchObject({
      label: 'Fixture',
      format: 'sf3',
      byteLength: 3,
      presetCount: 3,
      pitchedPresets: [{ name: 'Piano' }, { name: 'Strings' }],
      drumPreset: { name: 'Standard Kit', isDrum: true },
    })
    expect(result.failureModes).toEqual({
      missingBankRejected: true,
      corruptBankRejected: true,
    })
    expect(result.overlappingPitchedNotes).toBe(true)
    expect(result.scheduledNotes).toHaveLength(3)
    expect(result.scheduledNotes[2]).toMatchObject({ channel: 9, note: 36 })
    expect(result.memory).toEqual({
      beforeBytes: 1_000,
      afterLoadBytes: 1_600,
      deltaBytes: 600,
    })
    expect(waited).toBeGreaterThan(0)
    expect(backend.disposed).toBe(true)
  })

  it('fails explicitly when a bank lacks the required probe presets', async () => {
    const backend = new FakeProbeBackend(presets.slice(0, 1))

    await expect(
      runSoundFontProbe(
        {
          bytes: new Uint8Array([1, 2, 3]).buffer,
          format: 'sf2',
          label: 'Incomplete',
        },
        { backend, wait: async () => undefined },
      ),
    ).rejects.toThrow('two pitched presets and one drum preset')
    expect(backend.disposed).toBe(true)
  })
})

describe('soundBankContainerKind', () => {
  it('recognizes SoundFont and DLS RIFF containers before worklet loading', () => {
    const container = (kind: string) => {
      const bytes = new Uint8Array(12)
      bytes.set(new TextEncoder().encode('RIFF'), 0)
      bytes.set(new TextEncoder().encode(kind), 8)
      return bytes.buffer
    }

    expect(soundBankContainerKind(container('sfbk'))).toBe('soundfont')
    expect(soundBankContainerKind(container('DLS '))).toBe('dls')
    expect(soundBankContainerKind(container('WAVE'))).toBeUndefined()
    expect(
      soundBankContainerKind(new Uint8Array([0, 1, 2, 3]).buffer),
    ).toBeUndefined()
  })
})
