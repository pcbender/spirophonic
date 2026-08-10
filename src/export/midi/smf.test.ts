import { describe, expect, it } from 'vitest'

import { buildMidiFile, decodeVariableLength, encodeVariableLength } from './smf'

const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')

const oneNoteFile = () =>
  buildMidiFile({
    ticksPerQuarter: 480,
    microsecondsPerBeat: 500_000,
    timeSignature: { numerator: 4, denominator: 4 },
    name: 'Test',
    tracks: [
      {
        name: 'Kick',
        notes: [{ tick: 0, channel: 9, note: 36, velocity: 100, duration: 32 }],
      },
    ],
  })

describe('encodeVariableLength', () => {
  it('encodes the boundary values of the format', () => {
    expect(encodeVariableLength(0)).toEqual([0x00])
    expect(encodeVariableLength(127)).toEqual([0x7f])
    expect(encodeVariableLength(128)).toEqual([0x81, 0x00])
    expect(encodeVariableLength(8192)).toEqual([0xc0, 0x00])
    expect(encodeVariableLength(0x0fffffff)).toEqual([0xff, 0xff, 0xff, 0x7f])
  })

  it('round-trips through the decoder', () => {
    for (const value of [0, 1, 127, 128, 255, 8192, 1_000_000, 0x0fffffff]) {
      const bytes = encodeVariableLength(value)

      expect(decodeVariableLength(bytes)).toEqual({ value, length: bytes.length })
    }
  })

  it('sets the continuation bit on every byte but the last', () => {
    const bytes = encodeVariableLength(0x0fffffff)

    for (const byte of bytes.slice(0, -1)) {
      expect(byte & 0x80).toBe(0x80)
    }

    expect(bytes[bytes.length - 1] & 0x80).toBe(0)
  })
})

describe('buildMidiFile', () => {
  it('writes a one-note file byte for byte', () => {
    // MThd, length 6, format 1, 2 tracks, 480 ticks per quarter note.
    const header = '4d 54 68 64 00 00 00 06 00 01 00 02 01 e0'
    // MTrk, 27 bytes: name "Test", 4/4, 500000us per beat, end of track.
    const tempo =
      '4d 54 72 6b 00 00 00 1b' +
      ' 00 ff 03 04 54 65 73 74' +
      ' 00 ff 58 04 04 02 18 08' +
      ' 00 ff 51 03 07 a1 20' +
      ' 00 ff 2f 00'
    // MTrk, 20 bytes: name "Kick", note on channel 10, note off 32 ticks later.
    const notes =
      '4d 54 72 6b 00 00 00 14' +
      ' 00 ff 03 04 4b 69 63 6b' +
      ' 00 99 24 64' +
      ' 20 89 24 40' +
      ' 00 ff 2f 00'

    expect(hex(oneNoteFile())).toBe(`${header} ${tempo} ${notes}`)
  })

  it('declares chunk lengths that match their payloads', () => {
    const bytes = oneNoteFile()
    let offset = 14 // past the header chunk

    while (offset < bytes.length) {
      const declared =
        (bytes[offset + 4] << 24) |
        (bytes[offset + 5] << 16) |
        (bytes[offset + 6] << 8) |
        bytes[offset + 7]

      expect(String.fromCharCode(...bytes.slice(offset, offset + 4))).toBe('MTrk')
      offset += 8 + declared
    }

    expect(offset).toBe(bytes.length)
  })

  it('ends every track', () => {
    const bytes = oneNoteFile()
    const trailer = [0xff, 0x2f, 0x00]
    let found = 0

    for (let index = 0; index + 3 <= bytes.length; index += 1) {
      if (trailer.every((byte, at) => bytes[index + at] === byte)) {
        found += 1
      }
    }

    expect(found).toBe(2)
  })

  it('writes a note off before a note on that share a tick', () => {
    const bytes = buildMidiFile({
      ticksPerQuarter: 480,
      microsecondsPerBeat: 500_000,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        {
          name: 'Hat',
          notes: [
            { tick: 0, channel: 9, note: 42, velocity: 90, duration: 48 },
            { tick: 48, channel: 9, note: 42, velocity: 90, duration: 48 },
          ],
        },
      ],
    })
    const text = hex(bytes)

    expect(text.indexOf('89 2a')).toBeLessThan(text.lastIndexOf('99 2a'))
  })

  it('writes timed controllers and pitch bends without adding note onsets', () => {
    const bytes = buildMidiFile({
      ticksPerQuarter: 480,
      microsecondsPerBeat: 500_000,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        {
          name: 'Modulated',
          notes: [{ tick: 0, channel: 0, note: 60, velocity: 90, duration: 480 }],
          controllers: [
            { tick: 120, channel: 0, controller: 74, value: 32 },
            { tick: 240, channel: 0, controller: 74, value: 96 },
          ],
          pitchBends: [
            { tick: 120, channel: 0, value: 4096 },
            { tick: 240, channel: 0, value: 12_288 },
          ],
        },
      ],
    })
    const text = hex(bytes)

    expect(text.match(/90 3c/g)).toHaveLength(1)
    expect(text.match(/b0 4a/g)).toHaveLength(2)
    expect(text.match(/e0 00 20|e0 00 60/g)).toHaveLength(2)
  })

  it('clamps values that would corrupt the stream', () => {
    const bytes = buildMidiFile({
      ticksPerQuarter: 480,
      microsecondsPerBeat: 500_000,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        {
          name: 'Loud',
          notes: [{ tick: 0, channel: 99, note: 300, velocity: 0, duration: 1 }],
        },
      ],
    })

    for (const byte of bytes) {
      expect(byte).toBeGreaterThanOrEqual(0)
      expect(byte).toBeLessThanOrEqual(255)
    }

    // Channel folds into range and velocity never reaches note-off.
    expect(hex(bytes)).toContain('9f 7f 01')
  })

  it('produces identical bytes for identical input', () => {
    expect(hex(oneNoteFile())).toBe(hex(oneNoteFile()))
  })
})
