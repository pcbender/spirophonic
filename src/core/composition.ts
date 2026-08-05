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

/**
 * How much of a Head's own past path is available for other Heads to encounter.
 * This is input, not derived state: the same Composition and request must
 * reproduce the same Trace encounters, so retention lives in the document.
 *
 * `window` retains `historySeconds` of path behind the observation time;
 * `full` retains everything back to the start of the performance window.
 * `maxSegments` is a hard ceiling that reports a diagnostic rather than
 * silently truncating.
 */
export type TraceObservationSpec = {
  enabled: boolean
  retention: 'window' | 'full'
  sampleRateHz: number
  maxSegments: number
  /** Whether a Head may encounter its own earlier path. */
  allowSelf: boolean
}

export type HeadSpec = {
  id: string
  name: string
  enabled: boolean
  phaseOffset: number
  offset: Point2
  attachment: HeadAttachmentSpec
  trace: TracePresentationSpec
  /** Optional so MG-01 through MG-14 documents stay valid; absent means off. */
  observation?: TraceObservationSpec
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

/** Concentric ellipse. `radius` is the semi-major axis. */
export type EllipseBoundarySpec = BoundaryBase & {
  kind: 'ellipse'
  radius: number
  eccentricity: number
}

/**
 * An annulus between two radii. Crossing its inner or outer edge produces a
 * paired entry/exit Encounter, so time inside the band can become duration.
 */
export type BandBoundarySpec = BoundaryBase & {
  kind: 'band'
  innerRadius: number
  outerRadius: number
}

/** One axis-aligned grid line, offset from the Field centre along `axis`. */
export type GridBoundarySpec = BoundaryBase & {
  kind: 'grid'
  axis: 'x' | 'y'
  offset: number
}

/** One turn of an Archimedean spiral r = a + b*theta. */
export type SpiralBoundarySpec = BoundaryBase & {
  kind: 'spiral'
  startRadius: number
  growthPerTurn: number
  turns: number
}

export type BoundarySpecUnion =
  | RingBoundarySpec
  | SpokeBoundarySpec
  | EllipseBoundarySpec
  | BandBoundarySpec
  | GridBoundarySpec
  | SpiralBoundarySpec

/**
 * How a Field moves. `fixed` is the MG-05 behaviour. `rotating` turns at its
 * own constant rate in turns per second, independent of Transport. Both
 * `transport-rotating` and `wheel-attached` derive their state from absolute
 * Transport time, so seeking stays deterministic.
 */
export type FieldMotionSpec =
  | { kind: 'fixed' }
  | { kind: 'rotating'; turnsPerSecond: number }
  | { kind: 'transport-rotating'; rate: CycleRate }
  | {
      kind: 'wheel-attached'
      wheelId: string
      followRotation: boolean
    }

/**
 * `rotation` and `motion` are optional so MG-05 ring Fields keep validating
 * byte-for-byte. Absent rotation is 0 and absent motion is fixed. Families
 * whose shape actually depends on orientation require rotation explicitly.
 */
export type FieldBase = {
  id: string
  name: string
  enabled: boolean
  center: Point2
  rotation?: number
  motion?: FieldMotionSpec
}

export type RingFieldSpec = FieldBase & {
  kind: 'rings'
  boundaries: Array<RingBoundarySpec>
}

export type SpokeFieldSpec = FieldBase & {
  kind: 'spokes'
  rotation: number
  boundaries: Array<SpokeBoundarySpec>
}

export type EllipseFieldSpec = FieldBase & {
  kind: 'ellipses'
  rotation: number
  boundaries: Array<EllipseBoundarySpec>
}

export type BandFieldSpec = FieldBase & {
  kind: 'bands'
  boundaries: Array<BandBoundarySpec>
}

export type GridFieldSpec = FieldBase & {
  kind: 'grid'
  rotation: number
  boundaries: Array<GridBoundarySpec>
}

export type SpiralFieldSpec = FieldBase & {
  kind: 'spiral'
  rotation: number
  boundaries: Array<SpiralBoundarySpec>
}

export type FieldSpec =
  | RingFieldSpec
  | SpokeFieldSpec
  | EllipseFieldSpec
  | BandFieldSpec
  | GridFieldSpec
  | SpiralFieldSpec

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
  /** Optional so MG-01 through MG-13 documents stay valid. */
  relationIds?: Array<string>
}

export type RelationKind = Extract<
  RelationEventKind,
  | 'conjunction'
  | 'closest-approach'
  | 'radial-alignment'
  | 'angular-alignment'
  | 'opposition'
  | 'direction-match'
>

/**
 * Which Head pairs a detector watches, and how tightly. `threshold` is in the
 * detector's own units: world distance for conjunction and radial-alignment,
 * radians for angular-alignment, opposition, and direction-match. Unused by
 * closest-approach, which reports true local minima instead of a crossing.
 *
 * `hysteresis` widens the release threshold so a pair hovering at the boundary
 * does not chatter, and `minSeparationSeconds` debounces repeat fires.
 *
 * Pair order is canonical: subjects are sorted by Head id, so A is always the
 * lexicographically smaller id. Symmetric measurements are unaffected by that
 * choice; signed ones are documented in relations.ts.
 */
export type RelationSpec = {
  id: string
  name: string
  enabled: boolean
  kind: RelationKind
  /** Empty watches every enabled Head; otherwise only these participate. */
  headIds: Array<string>
  threshold: number
  hysteresis: number
  minSeparationSeconds: number
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

/**
 * `enabled` is authoring intent: a disabled Part is inert and its events are
 * never compiled. `mute` and `solo` are performance intent layered on top, so
 * silencing a Part while auditioning another never edits its configuration.
 * When any enabled Part solos, only soloed Parts sound.
 */
export type PartBase = {
  id: string
  name: string
  enabled: boolean
  mute: boolean
  solo: boolean
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
  presetName: string
  percussion: boolean
  reverb: number
  chorus: number
}

export type InstrumentSpec =
  | NativeSynthInstrumentSpec
  | NativeDrumInstrumentSpec
  | SoundFontInstrumentSpec

export type SoundBankFormat = 'sf2' | 'sf3' | 'dls'

export type SoundBankSource = 'local' | 'bundled' | 'remote'

export type SoundBankReference = {
  id: string
  name: string
  digest: string
  format: SoundBankFormat
  source: SoundBankSource
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
  /** Optional so MG-01 through MG-13 documents stay valid; absent means none. */
  relations?: Array<RelationSpec>
  soundBanks: Array<SoundBankReference>
  instruments: Array<InstrumentSpec>
  parts: Array<PartSpec>
  variation?: VariationSpec
}
