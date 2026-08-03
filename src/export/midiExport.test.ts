import { describe, expect, it } from 'vitest'

import type { VoiceNote } from '../core/voices'
import { percussionChannel } from '../core/voices'
import { buildMidiBytes, gmPercussion, midiTempo } from './midiExport'
import { decodeVariableLength } from './midi/smf'

const shaped = (t: number, velocity = 100, note: number = gmPercussion['bass-drum']): VoiceNote => ({
  t,
  strength: velocity / 127,
  source: 'zero-y',
  index: 0,
  velocity,
  note,
})

const kick = (notes: Array<VoiceNote>, gate = 1, steps = 16) => ({
  name: 'Kick',
  channel: percussionChannel,
  notes,
  steps,
  gate,
})

/** Walks a note track and returns the absolute tick of every note on. */
const noteOnTicks = (bytes: Uint8Array, trackIndex: number) => {
  let offset = 14

  for (let skipped = 0; skipped < trackIndex + 1; skipped += 1) {
    const length =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7]

    if (skipped === trackIndex) {
      offset += 8
      const end = offset + length
      const ticks: Array<number> = []
      let tick = 0

      while (offset < end) {
        const delta = decodeVariableLength(bytes, offset)

        offset += delta.length
        tick += delta.value

        const status = bytes[offset]

        if (status === 0xff) {
          const kind = bytes[offset + 1]
          const size = decodeVariableLength(bytes, offset + 2)

          offset += 2 + size.length + size.value

          if (kind === 0x2f) {
            break
          }
        } else {
          if ((status & 0xf0) === 0x90) {
            ticks.push(tick)
          }

          offset += 3
        }
      }

      return ticks
    }

    offset += 8 + length
  }

  return []
}

describe('midiTempo', () => {
  it('reads the cycle rate as a bar', () => {
    // A 0.2 cps cycle is a five second bar, so four beats land at 48 BPM.
    expect(midiTempo(0.2, 4)).toEqual({
      beatsPerMinute: 48,
      microsecondsPerBeat: 1_250_000,
    })
  })

  it('scales with the beats in a bar', () => {
    expect(midiTempo(0.2, 3).beatsPerMinute).toBe(36)
    expect(midiTempo(0.5, 4).beatsPerMinute).toBe(120)
  })

  it('clamps the cycle rate the way playback does', () => {
    expect(midiTempo(50, 4).beatsPerMinute).toBe(480)
    expect(midiTempo(0, 4).beatsPerMinute).toBeCloseTo(2.4, 9)
  })
})

describe('buildMidiBytes', () => {
  it('places onsets across the bar', () => {
    const bytes = buildMidiBytes([kick([shaped(0), shaped(0.25), shaped(0.5)])], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })

    // 4 beats * 480 ticks = 1920 ticks per bar.
    expect(noteOnTicks(bytes, 1)).toEqual([0, 480, 960])
  })

  it('repeats the pattern across bars', () => {
    const bytes = buildMidiBytes([kick([shaped(0), shaped(0.5)])], {
      cyclesPerSecond: 0.2,
      bars: 3,
    })

    expect(noteOnTicks(bytes, 1)).toEqual([0, 960, 1920, 2880, 3840, 4800])
  })

  it('writes one track per voice plus the tempo track', () => {
    const bytes = buildMidiBytes(
      [
        kick([shaped(0)]),
        {
          name: 'Hat',
          channel: percussionChannel,
          steps: 16,
          gate: 1,
          notes: [
            shaped(0.25, 100, gmPercussion['closed-hi-hat']),
            shaped(0.75, 100, gmPercussion['closed-hi-hat']),
          ],
        },
      ],
      { cyclesPerSecond: 0.2, bars: 1 },
    )

    expect(bytes[10]).toBe(0)
    expect(bytes[11]).toBe(3)
    expect(noteOnTicks(bytes, 2)).toEqual([480, 1440])
  })

  it('keeps a three against two polyrhythm aligned to one bar', () => {
    const bytes = buildMidiBytes(
      [
        { ...kick([shaped(0), shaped(1 / 3), shaped(2 / 3)]), name: 'Three' },
        { ...kick([shaped(0), shaped(1 / 2)]), name: 'Two' },
      ],
      { cyclesPerSecond: 0.2, bars: 1 },
    )

    expect(noteOnTicks(bytes, 1)).toEqual([0, 640, 1280])
    expect(noteOnTicks(bytes, 2)).toEqual([0, 960])
  })

  it('produces identical bytes for identical input', () => {
    const build = () =>
      buildMidiBytes([kick([shaped(0), shaped(0.375)])], {
        cyclesPerSecond: 0.2,
        bars: 2,
      })

    expect([...build()]).toEqual([...build()])
  })

  it('writes percussion on channel 10', () => {
    const bytes = buildMidiBytes([kick([shaped(0)])], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })

    expect([...bytes].some((byte) => byte === 0x99)).toBe(true)
  })
})

/** Walks a note track and returns [onTick, offTick] for every note. */
const noteSpans = (bytes: Uint8Array, trackIndex: number) => {
  let offset = 14

  for (let skipped = 0; skipped < trackIndex + 1; skipped += 1) {
    const length =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7]

    if (skipped === trackIndex) {
      offset += 8
      const end = offset + length
      const open: Array<number> = []
      const spans: Array<[number, number]> = []
      let tick = 0

      while (offset < end) {
        const delta = decodeVariableLength(bytes, offset)

        offset += delta.length
        tick += delta.value

        const status = bytes[offset]

        if (status === 0xff) {
          const size = decodeVariableLength(bytes, offset + 2)

          if (bytes[offset + 1] === 0x2f) {
            break
          }

          offset += 2 + size.length + size.value
        } else {
          if ((status & 0xf0) === 0x90) {
            open.push(tick)
          } else if ((status & 0xf0) === 0x80) {
            const start = open.shift()

            if (start !== undefined) {
              spans.push([start, tick])
            }
          }

          offset += 3
        }
      }

      return spans
    }

    offset += 8 + length
  }

  return []
}

describe('note length', () => {
  const bar = 1920

  it('fills one grid step by default', () => {
    const bytes = buildMidiBytes([kick([shaped(0), shaped(0.25)], 1, 16)], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })

    for (const [on, off] of noteSpans(bytes, 1)) {
      expect(off - on).toBe(bar / 16)
    }
  })

  it('follows the grid the voice is on', () => {
    const bytes = buildMidiBytes([kick([shaped(0)], 1, 8)], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })

    expect(noteSpans(bytes, 1)[0][1]).toBe(bar / 8)
  })

  it('keeps consecutive notes apart at a gate of one', () => {
    const bytes = buildMidiBytes(
      [kick([shaped(0), shaped(1 / 16), shaped(2 / 16)], 1, 16)],
      { cyclesPerSecond: 0.2, bars: 1 },
    )
    const spans = noteSpans(bytes, 1)

    for (let index = 1; index < spans.length; index += 1) {
      expect(spans[index][0]).toBeGreaterThanOrEqual(spans[index - 1][1])
    }
  })

  it('overlaps notes into a chord only when asked to', () => {
    const bytes = buildMidiBytes(
      [kick([shaped(0), shaped(1 / 16), shaped(2 / 16)], 6, 16)],
      { cyclesPerSecond: 0.2, bars: 1 },
    )
    const spans = noteSpans(bytes, 1)

    expect(spans[0][1]).toBe(6 * (bar / 16))
    expect(spans[1][0]).toBeLessThan(spans[0][1])
  })

  it('never writes a note of no length', () => {
    const bytes = buildMidiBytes([kick([shaped(0)], 0, 16)], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })

    expect(noteSpans(bytes, 1)[0][1]).toBeGreaterThan(noteSpans(bytes, 1)[0][0])
  })
})

describe('note length against loose timing', () => {
  const loose = (times: Array<number>, gate = 1) => ({
    name: 'Loose',
    channel: 0,
    steps: 16,
    gate,
    notes: times.map((t) => shaped(t)),
  })

  it('never overlaps a line at a gate of one', () => {
    // Onsets 104 ticks apart on a 120 tick grid: a full step would smear.
    const bytes = buildMidiBytes([loose([5 / 1920, 109 / 1920, 228 / 1920])], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })
    const spans = noteSpans(bytes, 1)

    for (let index = 1; index < spans.length; index += 1) {
      expect(spans[index][0]).toBeGreaterThanOrEqual(spans[index - 1][1])
    }
  })

  it('still fills the step when there is room', () => {
    const bytes = buildMidiBytes([loose([0, 0.25, 0.5])], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })

    expect(noteSpans(bytes, 1)[0][1]).toBe(120)
  })

  it('leaves a deliberate overlap alone', () => {
    const bytes = buildMidiBytes([loose([0, 1 / 16, 2 / 16], 6)], {
      cyclesPerSecond: 0.2,
      bars: 1,
    })
    const spans = noteSpans(bytes, 1)

    expect(spans[0][1] - spans[0][0]).toBe(720)
    expect(spans[1][0]).toBeLessThan(spans[0][1])
  })
})
