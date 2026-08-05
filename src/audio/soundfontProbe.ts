import { WorkletSynthesizer } from 'spessasynth_lib'

import type { SoundBankFormat } from '../core/composition'
import { sha256Hex } from './soundbankStore'
import {
  registerSpessaSynthWorklet,
  SPESSASYNTH_WORKLET_URL,
} from './spessasynthWorklet'

export const SPESSASYNTH_LIB_VERSION = '4.3.12'
export const SPESSASYNTH_CORE_VERSION = '4.3.16'

export type SoundFontProbePreset = {
  name: string
  program: number
  bankMSB: number
  bankLSB: number
  isDrum: boolean
}

export type SoundFontProbeNote = {
  channel: number
  note: number
  velocity: number
  startSeconds: number
  endSeconds: number
  preset: SoundFontProbePreset
}

export type SoundFontProbeBackend = {
  initialize: () => Promise<void>
  loadBank: (
    bytes: ArrayBuffer,
    id: string,
  ) => Promise<Array<SoundFontProbePreset>>
  currentTime: () => number
  schedule: (notes: ReadonlyArray<SoundFontProbeNote>) => Promise<void>
  memoryBytes: () => number | null
  dispose: () => Promise<void>
}

export type SoundFontProbeInput = {
  bytes: ArrayBuffer
  format: Extract<SoundBankFormat, 'sf2' | 'sf3'>
  label: string
}

export type SoundFontProbeResult = {
  libraryVersion: string
  coreVersion: string
  workletUrl: string
  bank: {
    label: string
    format: 'sf2' | 'sf3'
    digest: string
    byteLength: number
    presetCount: number
    pitchedPresets: [SoundFontProbePreset, SoundFontProbePreset]
    drumPreset: SoundFontProbePreset
  }
  timings: {
    initializationMs: number
    bankLoadMs: number
    disposalMs: number
    schedulingLeadSeconds: number
  }
  memory: {
    beforeBytes: number | null
    afterLoadBytes: number | null
    deltaBytes: number | null
  }
  failureModes: {
    missingBankRejected: boolean
    corruptBankRejected: boolean
  }
  scheduledNotes: Array<SoundFontProbeNote>
  overlappingPitchedNotes: boolean
}

export type SoundFontProbeOptions = {
  backend?: SoundFontProbeBackend
  now?: () => number
  wait?: (milliseconds: number) => Promise<void>
  digest?: (bytes: ArrayBuffer) => Promise<string>
}

type MemoryPerformance = Performance & {
  memory?: { usedJSHeapSize?: number }
}

const browserHeapBytes = () => {
  const memory = (globalThis.performance as MemoryPerformance | undefined)
    ?.memory
  return typeof memory?.usedJSHeapSize === 'number'
    ? memory.usedJSHeapSize
    : null
}

const asPreset = (preset: {
  name: string
  program: number
  bankMSB: number
  bankLSB: number
  isDrum: boolean
}): SoundFontProbePreset => ({
  name: preset.name,
  program: preset.program,
  bankMSB: preset.bankMSB,
  bankLSB: preset.bankLSB,
  isDrum: preset.isDrum,
})

const asciiAt = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length))

export const soundBankContainerKind = (bytes: ArrayBuffer) => {
  if (bytes.byteLength < 12) return undefined
  const view = new Uint8Array(bytes)
  const riff = asciiAt(view, 0, 4)
  if (riff !== 'RIFF' && riff !== 'RIFS') return undefined
  const kind = asciiAt(view, 8, 4)
  if (kind === 'sfbk') return 'soundfont' as const
  if (kind === 'DLS ') return 'dls' as const
  return undefined
}

export class SpessaSynthProbeBackend implements SoundFontProbeBackend {
  private context?: AudioContext
  private synthesizer?: WorkletSynthesizer
  private bankLoaded = false

  async initialize() {
    if (this.context || this.synthesizer) {
      throw new Error('The SoundFont probe backend is already initialized.')
    }
    const context = new AudioContext({ latencyHint: 'interactive' })
    this.context = context
    await registerSpessaSynthWorklet(context)
    const synthesizer = new WorkletSynthesizer(context)
    this.synthesizer = synthesizer
    await synthesizer.isReady
    await context.resume()
  }

  async loadBank(bytes: ArrayBuffer, id: string) {
    if (!soundBankContainerKind(bytes)) {
      throw new Error('Invalid SoundFont/DLS RIFF container.')
    }
    const synthesizer = this.requireSynthesizer()
    await synthesizer.soundBankManager.addSoundBank(bytes.slice(0), id)
    await synthesizer.isReady
    this.bankLoaded = true
    return synthesizer.presetList.map(asPreset)
  }

  currentTime() {
    return this.requireSynthesizer().currentTime
  }

  async schedule(notes: ReadonlyArray<SoundFontProbeNote>) {
    if (!this.bankLoaded) {
      throw new Error('No SoundFont bank is loaded.')
    }
    const synthesizer = this.requireSynthesizer()
    for (const note of notes) {
      const channel = note.channel & 0x0f
      synthesizer.midiChannels[channel].setDrums(note.preset.isDrum)
      synthesizer.sendMessage(
        [0xb0 | channel, 0, note.preset.bankMSB],
        0,
        { time: note.startSeconds },
      )
      synthesizer.sendMessage(
        [0xb0 | channel, 32, note.preset.bankLSB],
        0,
        { time: note.startSeconds },
      )
      synthesizer.programChange(channel, note.preset.program, {
        time: note.startSeconds,
      })
      synthesizer.noteOn(channel, note.note, note.velocity, {
        time: note.startSeconds,
      })
      synthesizer.noteOff(channel, note.note, { time: note.endSeconds })
    }
  }

  memoryBytes() {
    return browserHeapBytes()
  }

  async dispose() {
    this.synthesizer?.stopAll(true)
    this.synthesizer?.destroy()
    this.synthesizer = undefined
    this.bankLoaded = false
    const context = this.context
    this.context = undefined
    if (context && context.state !== 'closed') await context.close()
  }

  private requireSynthesizer() {
    if (!this.synthesizer) {
      throw new Error('The SoundFont probe backend is not initialized.')
    }
    return this.synthesizer
  }
}

const selectProbePresets = (presets: ReadonlyArray<SoundFontProbePreset>) => {
  const pitched = presets.filter((preset) => !preset.isDrum)
  const first = pitched[0]
  const second = pitched.find(
    (preset) =>
      preset.program !== first?.program ||
      preset.bankMSB !== first?.bankMSB ||
      preset.bankLSB !== first?.bankLSB,
  )
  const drum = presets.find((preset) => preset.isDrum)
  if (!first || !second || !drum) {
    throw new Error(
      'The probe bank must expose at least two pitched presets and one drum preset.',
    )
  }
  return { first, second, drum }
}

const notesFor = (
  startSeconds: number,
  presets: ReturnType<typeof selectProbePresets>,
): Array<SoundFontProbeNote> => [
  {
    channel: 0,
    note: 60,
    velocity: 108,
    startSeconds,
    endSeconds: startSeconds + 0.7,
    preset: presets.first,
  },
  {
    channel: 1,
    note: 67,
    velocity: 96,
    startSeconds: startSeconds + 0.1,
    endSeconds: startSeconds + 0.75,
    preset: presets.second,
  },
  {
    channel: 9,
    note: 36,
    velocity: 118,
    startSeconds: startSeconds + 0.2,
    endSeconds: startSeconds + 0.32,
    preset: presets.drum,
  },
]

const overlaps = (left: SoundFontProbeNote, right: SoundFontProbeNote) =>
  left.startSeconds < right.endSeconds &&
  right.startSeconds < left.endSeconds

export const runSoundFontProbe = async (
  input: SoundFontProbeInput,
  options: SoundFontProbeOptions = {},
): Promise<SoundFontProbeResult> => {
  const backend = options.backend ?? new SpessaSynthProbeBackend()
  const now = options.now ?? (() => performance.now())
  const wait =
    options.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const digest = options.digest ?? sha256Hex
  const beforeBytes = backend.memoryBytes()
  const initializationStarted = now()
  await backend.initialize()
  const initializationMs = now() - initializationStarted
  let missingBankRejected = false
  let corruptBankRejected = false
  let disposalMs = 0
  let result: SoundFontProbeResult | undefined

  try {
    try {
      await backend.schedule([])
    } catch {
      missingBankRejected = true
    }
    try {
      await backend.loadBank(new Uint8Array([0, 1, 2, 3]).buffer, 'corrupt')
    } catch {
      corruptBankRejected = true
    }

    const bankLoadStarted = now()
    const presets = await backend.loadBank(input.bytes, 'probe-bank')
    const bankLoadMs = now() - bankLoadStarted
    const afterLoadBytes = backend.memoryBytes()
    const selected = selectProbePresets(presets)
    const schedulingLeadSeconds = 0.15
    const scheduledNotes = notesFor(
      backend.currentTime() + schedulingLeadSeconds,
      selected,
    )
    await backend.schedule(scheduledNotes)
    const lastEnd = Math.max(...scheduledNotes.map((note) => note.endSeconds))
    await wait(
      Math.max(0, lastEnd - backend.currentTime() + 0.1) * 1_000,
    )

    result = {
      libraryVersion: SPESSASYNTH_LIB_VERSION,
      coreVersion: SPESSASYNTH_CORE_VERSION,
      workletUrl: SPESSASYNTH_WORKLET_URL,
      bank: {
        label: input.label,
        format: input.format,
        digest: await digest(input.bytes),
        byteLength: input.bytes.byteLength,
        presetCount: presets.length,
        pitchedPresets: [selected.first, selected.second],
        drumPreset: selected.drum,
      },
      timings: {
        initializationMs,
        bankLoadMs,
        disposalMs,
        schedulingLeadSeconds,
      },
      memory: {
        beforeBytes,
        afterLoadBytes,
        deltaBytes:
          beforeBytes === null || afterLoadBytes === null
            ? null
            : afterLoadBytes - beforeBytes,
      },
      failureModes: { missingBankRejected, corruptBankRejected },
      scheduledNotes,
      overlappingPitchedNotes: overlaps(scheduledNotes[0], scheduledNotes[1]),
    }
  } finally {
    const disposalStarted = now()
    await backend.dispose()
    disposalMs = now() - disposalStarted
    if (result) result.timings.disposalMs = disposalMs
  }

  return result
}
