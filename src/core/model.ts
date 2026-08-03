export type RotationMode = 'inside' | 'outside'

export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth'

export type FrequencyMode = 'radius' | 'x' | 'y' | 'angle' | 'ratio'

export type HueSource = 'angle' | 'radius' | 'velocity' | 'curvature'

export type CurveFamily =
  | 'spirogram'
  | 'lissajous'
  | 'rose'
  | 'superformula'
  | 'harmonograph'

export type ModelVersion = '0.2'

export type CurveEventSource =
  | 'zero-x'
  | 'zero-y'
  | 'curvature'
  | 'radius-max'
  | 'radius-min'

export type CrossingDirection = 'rising' | 'falling' | 'both'

export type ExtractOptions = {
  source: CurveEventSource
  direction?: CrossingDirection
  threshold?: number
  minSeparation?: number
  maxEvents?: number
}

export type QuantizeOptions = {
  divisions: number
  strength: number
}

export type VelocityOptions = {
  min: number
  max: number
  gamma: number
}

export type SpirophonicModel = {
  id: string
  name: string
  version: ModelVersion
  geometry: {
    /** Which curve the fields below describe. */
    family: CurveFamily
    // spirogram
    fixedRadius: number
    movingRadius: number
    penOffset: number
    phase: number
    rotation: RotationMode
    samples: number
    // lissajous: x = sin(a*theta + delta), y = sin(b*theta)
    lissFreqX: number
    lissFreqY: number
    lissDelta: number
    // rose: r = cos((n/d) * theta)
    roseN: number
    roseD: number
    // superformula (Gielis, a = b = 1)
    sfM: number
    sfN1: number
    sfN2: number
    sfN3: number
    // harmonograph: a damped lissajous, closed by retracing
    harmFreqX: number
    harmFreqY: number
    harmDelta: number
    harmDamping: number
    harmTurns: number
  }
  time: {
    cyclesPerSecond: number
    durationSeconds: number
  }
  sound: {
    enabled: boolean
    baseFrequencyHz: number
    frequencyMode: FrequencyMode
    minFrequencyHz: number
    maxFrequencyHz: number
    waveform: Waveform
  }
  color: {
    hueSource: HueSource
    saturation: number
    lightness: number
  }
  /** Parts, each reading its own curve. */
  voices: Array<Voice>
}

export type VoiceKind = 'percussion' | 'pitched'

export type PitchSource = 'radius' | 'angle' | 'x' | 'y'

export type ScaleName =
  | 'chromatic'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'pentatonic-major'
  | 'pentatonic-minor'

export type PitchOptions = {
  /** Which property of the curve at the onset chooses the note. */
  source: PitchSource
  scale: ScaleName
  /** MIDI note the scale is rooted on. */
  root: number
  /** How far the pitch may travel above the root. */
  octaves: number
}

/**
 * One part, driven by one curve. Giving each voice its own geometry is what
 * lets a three-against-two polyrhythm be composed as two visible shapes.
 */
export type Voice = {
  id: string
  name: string
  enabled: boolean
  kind: VoiceKind
  geometry: SpirophonicModel['geometry']
  trigger: ExtractOptions
  velocity: VelocityOptions
  quantize: QuantizeOptions
  /** MIDI channel. Percussion belongs on 9. */
  channel: number
  /** Fixed note for percussion; the starting point for a pitched part. */
  note: number
  /** How a pitched voice chooses notes. Ignored by percussion. */
  pitch: PitchOptions
  /** General MIDI program for a pitched voice. */
  program?: number
  /** Held length in ticks. Percussion one-shots want a short value. */
  durationTicks?: number
  /** Trace color, so a composition reads as separate shapes. */
  color?: string
}

/**
 * Defaults for every field a v0.1 document predates. Kept beside the type so a
 * new geometry field cannot be added without deciding how old files inherit it.
 */
export const familyDefaults = {
  family: 'spirogram' as CurveFamily,
  lissFreqX: 3,
  lissFreqY: 2,
  lissDelta: Math.PI / 2,
  roseN: 5,
  roseD: 1,
  sfM: 6,
  sfN1: 0.3,
  sfN2: 0.3,
  sfN3: 0.3,
  harmFreqX: 3.01,
  harmFreqY: 2,
  harmDelta: Math.PI / 2,
  harmDamping: 0.02,
  harmTurns: 12,
}
