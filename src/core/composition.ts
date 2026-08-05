export const compositionVersion = '1.0' as const

export type CompositionVersion = typeof compositionVersion

export type Point2 = {
  x: number
  y: number
}

export type SpaceSpec = {
  center: Point2
  scale: number
}

export type MeterSpec = {
  beatsPerBar: number
  beatUnit: 2 | 4 | 8 | 16
}

export type LoopSpec = {
  startBeat: number
  lengthBeats: number
}

export type TransportSpec = {
  tempoBpm: number
  meter: MeterSpec
  loop: LoopSpec
}

export type CycleRate = {
  cycles: number
  beats: number
}

export type SpirogramMotionSpec = {
  kind: 'spirogram'
  fixedRadius: number
  movingRadius: number
  rotation: 'inside' | 'outside'
}

export type LissajousMotionSpec = {
  kind: 'lissajous'
  frequencyX: number
  frequencyY: number
  delta: number
}

export type RoseMotionSpec = {
  kind: 'rose'
  numerator: number
  denominator: number
}

export type SuperformulaMotionSpec = {
  kind: 'superformula'
  symmetry: number
  n1: number
  n2: number
  n3: number
}

export type HarmonographMotionSpec = {
  kind: 'harmonograph'
  frequencyX: number
  frequencyY: number
  delta: number
  damping: number
  amplitudeX: number
  amplitudeY: number
}

export type MotionSpec =
  | SpirogramMotionSpec
  | LissajousMotionSpec
  | RoseMotionSpec
  | SuperformulaMotionSpec
  | HarmonographMotionSpec

export type SpirogramHeadAttachment = {
  kind: 'spirogram'
  penOffset: number
}

export type LissajousHeadAttachment = {
  kind: 'lissajous'
  scaleX: number
  scaleY: number
  phaseX: number
  phaseY: number
}

export type RoseHeadAttachment = {
  kind: 'rose'
  radiusScale: number
  angularOffset: number
}

export type SuperformulaHeadAttachment = {
  kind: 'superformula'
  radiusScale: number
  angularOffset: number
}

export type HarmonographHeadAttachment = {
  kind: 'harmonograph'
  amplitudeScale: number
  phaseX: number
  phaseY: number
}

export type HeadAttachmentSpec =
  | SpirogramHeadAttachment
  | LissajousHeadAttachment
  | RoseHeadAttachment
  | SuperformulaHeadAttachment
  | HarmonographHeadAttachment

export type TracePresentationSpec = {
  visible: boolean
  color: string
  lineWidth: number
  opacity: number
  mode: 'full' | 'animated'
  historySeconds: number
}

export type HeadSpec = {
  id: string
  name: string
  enabled: boolean
  phaseOffset: number
  offset: Point2
  attachment: HeadAttachmentSpec
  trace: TracePresentationSpec
}

export type WheelSpec = {
  id: string
  name: string
  enabled: boolean
  center: Point2
  rate: CycleRate
  phase: number
  direction: 'forward' | 'reverse'
  motion: MotionSpec
  heads: Array<HeadSpec>
}

export type BoundaryBase = {
  id: string
  name: string
  enabled: boolean
  index: number
}

export type RingBoundarySpec = BoundaryBase & {
  kind: 'ring'
  radius: number
}

export type SpokeBoundarySpec = BoundaryBase & {
  kind: 'spoke'
  angle: number
}

export type RingFieldSpec = {
  id: string
  name: string
  enabled: boolean
  kind: 'rings'
  center: Point2
  boundaries: Array<RingBoundarySpec>
}

export type SpokeFieldSpec = {
  id: string
  name: string
  enabled: boolean
  kind: 'spokes'
  center: Point2
  rotation: number
  boundaries: Array<SpokeBoundarySpec>
}

export type FieldSpec = RingFieldSpec | SpokeFieldSpec

export type RelationEventKind =
  | 'boundary-crossing'
  | 'trace-crossing'
  | 'conjunction'
  | 'closest-approach'
  | 'radial-alignment'
  | 'angular-alignment'
  | 'opposition'
  | 'direction-match'

export type EncounterDirection =
  | 'inward'
  | 'outward'
  | 'clockwise'
  | 'counterclockwise'
  | 'approaching'
  | 'receding'

export type EncounterQuery = {
  kinds: Array<RelationEventKind>
  wheelIds: Array<string>
  headIds: Array<string>
  fieldIds: Array<string>
  boundaryIds: Array<string>
  directions: Array<EncounterDirection>
  minStrength: number
}

export type OnsetMapping = {
  kind: 'encounter-time'
}

export type ScaleName =
  | 'chromatic'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'pentatonic-major'
  | 'pentatonic-minor'

export type PitchMapping =
  | { kind: 'fixed-midi'; note: number }
  | { kind: 'fixed-frequency'; frequencyHz: number }
  | {
      kind: 'boundary-degree'
      root: number
      scale: ScaleName
      octaves: number
    }
  | { kind: 'ratio'; rootFrequencyHz: number; octaveFold: boolean }
  | {
      kind: 'spatial'
      source: 'x' | 'y' | 'radius' | 'angle'
      root: number
      scale: ScaleName
      octaves: number
    }
  | {
      kind: 'contour'
      source: 'x' | 'y' | 'radius' | 'angle'
      root: number
      scale: ScaleName
      octaves: number
    }

export type VelocityMapping =
  | { kind: 'constant'; value: number }
  | { kind: 'encounter-strength'; min: number; max: number; gamma: number }

export type DurationMapping =
  | { kind: 'fixed'; beats: number }
  | { kind: 'inside-band' }
  | { kind: 'until-next'; maxBeats: number }

export type QuantizeSpec = {
  gridBeats: number
  strength: number
}

export type PartBase = {
  id: string
  name: string
  enabled: boolean
  encounterQuery: EncounterQuery
  instrumentId: string
}

export type NotePartSpec = PartBase & {
  kind: 'note'
  onset: OnsetMapping
  pitch: PitchMapping
  velocity: VelocityMapping
  duration: DurationMapping
  quantize?: QuantizeSpec
}

export type ControlPartSpec = PartBase & {
  kind: 'control'
  control: {
    name: string
    source: 'distance' | 'angle' | 'approach-rate' | 'rotation-rate' | 'strength'
    min: number
    max: number
    sampleRateHz: number
    smoothingSeconds: number
  }
}

export type PartSpec = NotePartSpec | ControlPartSpec

export type EnvelopeSpec = {
  attackSeconds: number
  decaySeconds: number
  sustain: number
  releaseSeconds: number
}

export type InstrumentBase = {
  id: string
  name: string
  gain: number
  pan: number
}

export type NativeSynthInstrumentSpec = InstrumentBase & {
  kind: 'native-synth'
  waveform: 'sine' | 'triangle' | 'square' | 'sawtooth'
  envelope: EnvelopeSpec
}

export type NativeDrumInstrumentSpec = InstrumentBase & {
  kind: 'native-drum'
  voice: 'kick' | 'snare' | 'hat' | 'tom' | 'clap' | 'cymbal'
}

export type SoundFontInstrumentSpec = InstrumentBase & {
  kind: 'soundfont'
  soundBankId: string
  bank: number
  program: number
  percussion: boolean
  reverb: number
  chorus: number
}

export type InstrumentSpec =
  | NativeSynthInstrumentSpec
  | NativeDrumInstrumentSpec
  | SoundFontInstrumentSpec

export type SoundBankReference = {
  id: string
  name: string
  digest: string
  format: 'sf2' | 'sf3' | 'dls'
  source: 'local' | 'bundled' | 'remote'
  license: string
  attribution: string
}

export type VariationSpec = {
  enabled: boolean
  seed: string
}

export type Composition = {
  version: CompositionVersion
  id: string
  name: string
  space: SpaceSpec
  transport: TransportSpec
  wheels: Array<WheelSpec>
  fields: Array<FieldSpec>
  soundBanks: Array<SoundBankReference>
  instruments: Array<InstrumentSpec>
  parts: Array<PartSpec>
  variation?: VariationSpec
}
