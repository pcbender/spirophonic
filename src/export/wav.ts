/**
 * RIFF/WAVE encoder.
 *
 * Every choice a decoder needs is stated rather than inferred: sample rate,
 * channel count, and bit depth are required inputs, and the sample conversion
 * is fixed and symmetric so the same float buffers always produce the same
 * bytes. Nothing here reaches into geometry, Composition, or performance types.
 */

export type WavBitDepth = 16 | 24 | 32

export type WavEncodeOptions = Readonly<{
  sampleRateHz: number
  /** 16 and 24 are integer PCM; 32 is IEEE float. */
  bitDepth?: WavBitDepth
}>

export type WavEncodeResult = Readonly<{
  /** Backed by a plain ArrayBuffer, so it can go straight into a Blob. */
  bytes: Uint8Array<ArrayBuffer>
  sampleRateHz: number
  channelCount: number
  bitDepth: WavBitDepth
  frameCount: number
  durationSeconds: number
  /**
   * Samples that fell outside [-1, 1] and were clamped. Non-zero means the
   * render is louder than the format can hold, which a caller should surface
   * rather than ship silently distorted audio.
   */
  clippedSampleCount: number
}>

const RIFF_HEADER_BYTES = 12
const FMT_CHUNK_BYTES = 24 // 8-byte chunk header + 16-byte PCM body
const FORMAT_PCM = 1
const FORMAT_IEEE_FLOAT = 3

/**
 * Integer conversion. Both directions use the same positive full-scale value,
 * so a signal and its negation encode to exact opposites. This gives up one
 * code at the negative extreme in exchange for symmetry, which matters when
 * two renders are compared sample-for-sample.
 */
const INT_FULL_SCALE: Readonly<Record<number, number>> = {
  16: 0x7fff,
  24: 0x7fffff,
}

/**
 * Math.round breaks ties toward +Infinity, so round(-x) is not -round(x) at
 * exact halves. Rounding away from zero keeps the symmetry above true for
 * every sample, not merely most of them.
 */
const roundHalfAwayFromZero = (value: number) =>
  value < 0 ? -Math.round(-value) : Math.round(value)

const ascii = (view: DataView, offset: number, text: string) => {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}

export const encodeWav = (
  channels: ReadonlyArray<Float32Array>,
  options: WavEncodeOptions,
): WavEncodeResult => {
  const bitDepth = options.bitDepth ?? 16
  const sampleRateHz = options.sampleRateHz

  if (channels.length === 0) {
    throw new RangeError('A WAV file needs at least one channel.')
  }
  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new RangeError(`Sample rate ${sampleRateHz} is not a positive number.`)
  }
  if (bitDepth !== 16 && bitDepth !== 24 && bitDepth !== 32) {
    throw new RangeError(`Unsupported WAV bit depth ${bitDepth}.`)
  }

  const frameCount = channels[0].length
  for (const channel of channels) {
    if (channel.length !== frameCount) {
      throw new RangeError(
        `WAV channels must be the same length; found ${frameCount} and ${channel.length}.`,
      )
    }
  }

  const channelCount = channels.length
  const bytesPerSample = bitDepth / 8
  const blockAlign = channelCount * bytesPerSample
  const dataBytes = frameCount * blockAlign
  const isFloat = bitDepth === 32
  // IEEE float declares cbSize and carries a fact chunk; integer PCM needs
  // neither, and older decoders are happier without them.
  const factBytes = isFloat ? 12 : 0
  const fmtBytes = isFloat ? FMT_CHUNK_BYTES + 2 : FMT_CHUNK_BYTES
  const totalBytes =
    RIFF_HEADER_BYTES + fmtBytes + factBytes + 8 + dataBytes

  const bytes = new Uint8Array(totalBytes)
  const view = new DataView(bytes.buffer)

  ascii(view, 0, 'RIFF')
  view.setUint32(4, totalBytes - 8, true)
  ascii(view, 8, 'WAVE')

  let offset = 12
  ascii(view, offset, 'fmt ')
  view.setUint32(offset + 4, fmtBytes - 8, true)
  view.setUint16(offset + 8, isFloat ? FORMAT_IEEE_FLOAT : FORMAT_PCM, true)
  view.setUint16(offset + 10, channelCount, true)
  view.setUint32(offset + 12, sampleRateHz, true)
  view.setUint32(offset + 16, sampleRateHz * blockAlign, true)
  view.setUint16(offset + 20, blockAlign, true)
  view.setUint16(offset + 22, bitDepth, true)
  if (isFloat) view.setUint16(offset + 24, 0, true)
  offset += fmtBytes

  if (isFloat) {
    ascii(view, offset, 'fact')
    view.setUint32(offset + 4, 4, true)
    view.setUint32(offset + 8, frameCount, true)
    offset += factBytes
  }

  ascii(view, offset, 'data')
  view.setUint32(offset + 4, dataBytes, true)
  offset += 8

  let clippedSampleCount = 0
  const fullScale = INT_FULL_SCALE[bitDepth]

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const raw = channels[channel][frame]
      // NaN would encode as an arbitrary bit pattern; treat it as silence and
      // count it, so a broken render is reported rather than written out.
      const finite = Number.isFinite(raw) ? raw : 0
      const clamped = Math.min(1, Math.max(-1, finite))
      if (clamped !== raw) clippedSampleCount += 1

      if (isFloat) {
        view.setFloat32(offset, clamped, true)
        offset += 4
      } else if (bitDepth === 16) {
        view.setInt16(offset, roundHalfAwayFromZero(clamped * fullScale), true)
        offset += 2
      } else {
        const value = roundHalfAwayFromZero(clamped * fullScale)
        view.setUint8(offset, value & 0xff)
        view.setUint8(offset + 1, (value >> 8) & 0xff)
        view.setUint8(offset + 2, (value >> 16) & 0xff)
        offset += 3
      }
    }
  }

  return Object.freeze({
    bytes,
    sampleRateHz,
    channelCount,
    bitDepth,
    frameCount,
    durationSeconds: frameCount / sampleRateHz,
    clippedSampleCount,
  })
}

export type WavHeader = Readonly<{
  sampleRateHz: number
  channelCount: number
  bitDepth: number
  frameCount: number
  durationSeconds: number
  isFloat: boolean
}>

/**
 * Reads back what {@link encodeWav} wrote. Tests and bundle verification use
 * this rather than trusting the encoder to describe its own output.
 */
export const readWavHeader = (bytes: Uint8Array): WavHeader => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (offset: number) =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    )

  if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    throw new RangeError('Not a RIFF/WAVE file.')
  }

  let offset = 12
  let format = 0
  let channelCount = 0
  let sampleRateHz = 0
  let bitDepth = 0
  let dataBytes = 0
  let sawFmt = false

  while (offset + 8 <= bytes.byteLength) {
    const chunkId = tag(offset)
    const chunkBytes = view.getUint32(offset + 4, true)
    const body = offset + 8

    if (chunkId === 'fmt ') {
      format = view.getUint16(body, true)
      channelCount = view.getUint16(body + 2, true)
      sampleRateHz = view.getUint32(body + 4, true)
      bitDepth = view.getUint16(body + 14, true)
      sawFmt = true
    } else if (chunkId === 'data') {
      dataBytes = chunkBytes
    }

    // RIFF chunks are word-aligned; odd-sized bodies carry a pad byte.
    offset = body + chunkBytes + (chunkBytes % 2)
  }

  if (!sawFmt) throw new RangeError('WAVE file has no fmt chunk.')

  const blockAlign = channelCount * (bitDepth / 8)
  const frameCount = blockAlign > 0 ? dataBytes / blockAlign : 0

  return Object.freeze({
    sampleRateHz,
    channelCount,
    bitDepth,
    frameCount,
    durationSeconds: sampleRateHz > 0 ? frameCount / sampleRateHz : 0,
    isFloat: format === FORMAT_IEEE_FLOAT,
  })
}
