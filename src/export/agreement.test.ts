import { describe, expect, it } from 'vitest'

import { defaultModel } from '../core/defaultModel'
import { renderVoices } from '../core/voices'
import { buildMidiBytes } from './midiExport'
import { decodeVariableLength } from './midi/smf'
import { exportStrudelSnippet } from './strudelExport'

/**
 * The MIDI file and the Strudel snippet are two adapters over one event list.
 * When they disagree the model has become ambiguous, so these compare the two
 * outputs rather than either one against a fixture.
 */
const allVoicesOn = {
  ...defaultModel,
  voices: defaultModel.voices.map((voice) => ({ ...voice, enabled: true })),
}

const midiNoteOnsPerTrack = (bytes: Uint8Array) => {
  const counts: Array<number> = []
  let offset = 14

  while (offset < bytes.length) {
    const length =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7]
    const end = offset + 8 + length
    let cursor = offset + 8
    let noteOns = 0

    while (cursor < end) {
      const delta = decodeVariableLength(bytes, cursor)

      cursor += delta.length

      const status = bytes[cursor]

      if (status === 0xff) {
        const size = decodeVariableLength(bytes, cursor + 2)

        if (bytes[cursor + 1] === 0x2f) {
          break
        }

        cursor += 2 + size.length + size.value
      } else if ((status & 0xf0) === 0xc0) {
        cursor += 2
      } else {
        if ((status & 0xf0) === 0x90) {
          noteOns += 1
        }

        cursor += 3
      }
    }

    counts.push(noteOns)
    offset = end
  }

  // Drop the tempo track, which carries no notes.
  return counts.slice(1)
}

const strudelStepsPerVoice = (snippet: string) =>
  snippet
    .split('\n')
    .filter((line) => line.includes('.gain('))
    .map(
      (line) =>
        (line.match(/^\s*(?:s|n)\("([^"]*)"\)/)?.[1] ?? '')
          .split(' ')
          .filter((token) => token !== '~').length,
    )

describe('the two exports describe the same part', () => {
  const bars = 4

  it('writes the same number of notes per voice', () => {
    const midi = midiNoteOnsPerTrack(
      buildMidiBytes(
        renderVoices(allVoicesOn).map((item) => ({
          name: item.voice.name,
          channel: item.voice.channel,
          program: item.voice.program,
          steps: item.voice.quantize.divisions,
          gate: item.voice.gate,
          notes: item.notes,
        })),
        { cyclesPerSecond: allVoicesOn.time.cyclesPerSecond, bars },
      ),
    )
    const strudel = strudelStepsPerVoice(exportStrudelSnippet(allVoicesOn))

    expect(midi.map((count) => count / bars)).toEqual(strudel)
  })

  it('writes the same number of notes as the model rendered', () => {
    const rendered = renderVoices(allVoicesOn).map((item) => item.notes.length)

    expect(strudelStepsPerVoice(exportStrudelSnippet(allVoicesOn))).toEqual(rendered)
  })

  it('agrees for every voice at every quantize strength', () => {
    for (const strength of [0, 0.25, 0.6, 1]) {
      const model = {
        ...allVoicesOn,
        voices: allVoicesOn.voices.map((voice) => ({
          ...voice,
          quantize: { ...voice.quantize, strength },
        })),
      }
      const rendered = renderVoices(model).map((item) => item.notes.length)

      expect(strudelStepsPerVoice(exportStrudelSnippet(model))).toEqual(rendered)
    }
  })
})
