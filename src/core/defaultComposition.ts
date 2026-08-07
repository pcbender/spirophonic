import {
  compositionVersion,
  type Composition,
  type SoundBankReference,
} from './composition'

/**
 * The sound bank that ships with the app.
 *
 * MuseScore_General is General MIDI under the MIT licence, so unlike an
 * arbitrary SF2 it may be redistributed — provided its copyright notices travel
 * with it, which is why the attribution below is not decoration and why
 * `MuseScore_General_License.md` sits beside the bank in `public/soundbanks/`.
 *
 * The reference lives here, in core, because it is Composition data. Fetching
 * and verifying the bytes belongs to `src/audio/bundledSoundBank.ts`; core
 * neither knows nor cares how the bank arrives.
 */
export const bundledSoundBank: SoundBankReference = Object.freeze({
  id: 'bank-musescore-general',
  name: 'MuseScore General',
  digest: '5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3',
  format: 'sf3',
  source: 'bundled',
  license: 'MIT',
  attribution:
    'FluidR3 by Frank Wen (2000-02); FluidR3Mono by Michael Cowgill (2014-17); MuseScore_General by S. Christian Collins (2018-20). Temple Blocks by Ethan Winer (2002); Drumline Cymbals by Michael Schorsch (2016).',
})

export const defaultComposition = {
  version: compositionVersion,
  id: 'simple-ring-crossing',
  name: 'Simple Ring Crossing',
  space: {
    center: { x: 0, y: 0 },
    scale: 1,
  },
  transport: {
    tempoBpm: 120,
    meter: { beatsPerBar: 4, beatUnit: 4 },
    loop: { startBeat: 0, lengthBeats: 4 },
  },
  wheels: [
    {
      id: 'wheel-1',
      name: 'Wheel 1',
      enabled: true,
      center: { x: 0, y: 0 },
      rate: { cycles: 1, beats: 4 },
      phase: 0,
      direction: 'forward',
      motion: {
        kind: 'spirogram',
        fixedRadius: 180,
        movingRadius: 65,
        rotation: 'inside',
      },
      heads: [
        {
          id: 'head-1',
          name: 'Head 1',
          enabled: true,
          phaseOffset: 0,
          offset: { x: 0, y: 0 },
          attachment: { kind: 'spirogram', penOffset: 95 },
          trace: {
            visible: true,
            color: '#6fd6c2',
            lineWidth: 2,
            opacity: 0.9,
            mode: 'animated',
            historySeconds: 8,
          },
        },
      ],
    },
  ],
  fields: [
    {
      id: 'field-rings',
      name: 'Rings',
      enabled: true,
      kind: 'rings',
      center: { x: 0, y: 0 },
      boundaries: [
        {
          id: 'ring-inner',
          name: 'Inner Ring',
          enabled: true,
          index: 0,
          kind: 'ring',
          radius: 90,
        },
        {
          id: 'ring-outer',
          name: 'Outer Ring',
          enabled: true,
          index: 1,
          kind: 'ring',
          radius: 180,
        },
      ],
    },
    {
      id: 'field-spokes',
      name: 'Spokes',
      enabled: true,
      kind: 'spokes',
      center: { x: 0, y: 0 },
      rotation: 0,
      boundaries: [
        {
          id: 'spoke-east',
          name: 'East Spoke',
          enabled: true,
          index: 0,
          kind: 'spoke',
          angle: 0,
        },
        {
          id: 'spoke-north',
          name: 'North Spoke',
          enabled: true,
          index: 1,
          kind: 'spoke',
          angle: Math.PI / 2,
        },
      ],
    },
  ],
  soundBanks: [
    // The bundled General MIDI bank is available from the start. It is fetched
    // in the background on first run and cached in the vault, so it costs
    // nothing until a Composition assigns one of its presets. Instruments here
    // stay native, which keeps the first-run experience instant and offline.
    { ...bundledSoundBank },
  ],
  instruments: [
    {
      id: 'instrument-1',
      name: 'Native Synth',
      kind: 'native-synth',
      gain: 0.5,
      pan: 0,
      waveform: 'triangle',
      envelope: {
        attackSeconds: 0.01,
        decaySeconds: 0.08,
        sustain: 0.7,
        releaseSeconds: 0.15,
      },
    },
  ],
  parts: [
    {
      id: 'part-1',
      name: 'Boundary Melody',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'note',
      encounterQuery: {
        kinds: ['boundary-crossing'],
        wheelIds: ['wheel-1'],
        headIds: ['head-1'],
        fieldIds: [],
        boundaryIds: [],
        directions: [],
        minStrength: 0,
      },
      instrumentId: 'instrument-1',
      onset: { kind: 'encounter-time' },
      pitch: {
        kind: 'boundary-degree',
        root: 48,
        scale: 'pentatonic-minor',
        octaves: 3,
      },
      velocity: {
        kind: 'encounter-strength',
        min: 48,
        max: 118,
        gamma: 1,
      },
      duration: { kind: 'fixed', beats: 0.25 },
      quantize: { gridBeats: 0.25, strength: 0.75 },
    },
  ],
} satisfies Composition

/**
 * A clean slate.
 *
 * Not literally empty: `compositionValidation` requires at least one Wheel and
 * at least one Instrument, and `compositionEdits` refuses to remove the last
 * Wheel, the last Head on a Wheel, or the last Instrument. The emptiest legal
 * Composition is therefore one Wheel carrying one Head, plus one Instrument
 * with nothing routed to it.
 *
 * It has no Fields and no Parts, which means it draws a Trace and makes no
 * sound. That is the honest starting point rather than a defect: an Encounter
 * needs a Boundary to cross, and a note needs a Part to decide it. The
 * Performance panel says so, in those terms, until both exist.
 */
export const blankComposition = {
  version: compositionVersion,
  id: 'untitled',
  name: 'Untitled',
  space: {
    center: { x: 0, y: 0 },
    scale: 1,
  },
  transport: {
    tempoBpm: 120,
    meter: { beatsPerBar: 4, beatUnit: 4 },
    loop: { startBeat: 0, lengthBeats: 4 },
  },
  wheels: [
    {
      id: 'wheel-1',
      name: 'Wheel 1',
      enabled: true,
      center: { x: 0, y: 0 },
      rate: { cycles: 1, beats: 4 },
      phase: 0,
      direction: 'forward',
      motion: {
        kind: 'spirogram',
        fixedRadius: 180,
        movingRadius: 65,
        rotation: 'inside',
      },
      heads: [
        {
          id: 'head-1',
          name: 'Head 1',
          enabled: true,
          phaseOffset: 0,
          offset: { x: 0, y: 0 },
          attachment: { kind: 'spirogram', penOffset: 95 },
          trace: {
            visible: true,
            color: '#6fd6c2',
            lineWidth: 2,
            opacity: 0.9,
            mode: 'animated',
            historySeconds: 8,
          },
        },
      ],
    },
  ],
  fields: [],
  soundBanks: [{ ...bundledSoundBank }],
  instruments: [
    {
      id: 'instrument-1',
      name: 'Native Synth',
      kind: 'native-synth',
      gain: 0.5,
      pan: 0,
      waveform: 'triangle',
      envelope: {
        attackSeconds: 0.01,
        decaySeconds: 0.08,
        sustain: 0.7,
        releaseSeconds: 0.15,
      },
    },
  ],
  parts: [],
} satisfies Composition

const traceColors = [
  '#6fd6c2',
  '#f2b880',
  '#9db4ff',
  '#e58fb8',
  '#c3e88d',
  '#ffd479',
] as const

const referenceHead = (
  wheelIndex: number,
  headIndex: number,
  penOffset: number,
) => ({
  id: `head-${wheelIndex}-${headIndex}`,
  name: `W${wheelIndex} Head ${headIndex}`,
  enabled: true,
  // Heads share their Wheel's phase; the offset is what separates them.
  phaseOffset: headIndex / 3,
  offset: { x: 0, y: 0 },
  attachment: { kind: 'spirogram' as const, penOffset },
  trace: {
    visible: true,
    color: traceColors[(wheelIndex * 3 + headIndex - 4) % traceColors.length],
    lineWidth: 2,
    opacity: 0.85,
    mode: 'animated' as const,
    historySeconds: 6,
  },
})

const referenceWheel = (
  index: number,
  center: { x: number; y: number },
  rate: { cycles: number; beats: number },
  fixedRadius: number,
  movingRadius: number,
) => ({
  id: `wheel-${index}`,
  name: `Wheel ${index}`,
  enabled: true,
  center,
  rate,
  phase: 0,
  direction: (index % 2 === 0 ? 'reverse' : 'forward') as
    | 'forward'
    | 'reverse',
  motion: {
    kind: 'spirogram' as const,
    fixedRadius,
    movingRadius,
    rotation: (index % 2 === 0 ? 'outside' : 'inside') as 'inside' | 'outside',
  },
  heads: [
    referenceHead(index, 1, movingRadius * 1.4),
    referenceHead(index, 2, movingRadius * 0.9),
    referenceHead(index, 3, movingRadius * 0.45),
  ],
})

/**
 * The MG-12 scalability reference: four Wheels, three Heads each, several Parts,
 * and four Instruments sounding together. It is deliberately heavier than the
 * default Composition, which stays the first-run experience.
 */
export const referenceComposition = {
  version: compositionVersion,
  id: 'reference-concurrent-wheels',
  name: 'Concurrent Wheels Reference',
  space: { center: { x: 0, y: 0 }, scale: 1 },
  transport: {
    tempoBpm: 110,
    meter: { beatsPerBar: 4, beatUnit: 4 },
    loop: { startBeat: 0, lengthBeats: 8 },
  },
  wheels: [
    referenceWheel(1, { x: -120, y: -70 }, { cycles: 1, beats: 4 }, 170, 60),
    referenceWheel(2, { x: 120, y: -70 }, { cycles: 3, beats: 8 }, 150, 45),
    referenceWheel(3, { x: -120, y: 90 }, { cycles: 2, beats: 4 }, 130, 52),
    referenceWheel(4, { x: 120, y: 90 }, { cycles: 5, beats: 8 }, 190, 38),
  ],
  fields: [
    {
      id: 'field-rings',
      name: 'Pitch Rings',
      enabled: true,
      kind: 'rings' as const,
      center: { x: 0, y: 0 },
      boundaries: [
        { id: 'ring-1', name: 'Ring 1', enabled: true, index: 0, kind: 'ring' as const, radius: 70 },
        { id: 'ring-2', name: 'Ring 2', enabled: true, index: 1, kind: 'ring' as const, radius: 130 },
        { id: 'ring-3', name: 'Ring 3', enabled: true, index: 2, kind: 'ring' as const, radius: 190 },
        { id: 'ring-4', name: 'Ring 4', enabled: true, index: 3, kind: 'ring' as const, radius: 250 },
      ],
    },
    {
      id: 'field-spokes',
      name: 'Pulse Spokes',
      enabled: true,
      kind: 'spokes' as const,
      center: { x: 0, y: 0 },
      rotation: 0,
      boundaries: [
        { id: 'spoke-1', name: 'Spoke E', enabled: true, index: 0, kind: 'spoke' as const, angle: 0 },
        { id: 'spoke-2', name: 'Spoke N', enabled: true, index: 1, kind: 'spoke' as const, angle: Math.PI / 2 },
        { id: 'spoke-3', name: 'Spoke W', enabled: true, index: 2, kind: 'spoke' as const, angle: Math.PI },
        { id: 'spoke-4', name: 'Spoke S', enabled: true, index: 3, kind: 'spoke' as const, angle: (3 * Math.PI) / 2 },
      ],
    },
  ],
  soundBanks: [{ ...bundledSoundBank }],
  instruments: [
    {
      id: 'instrument-bass',
      name: 'Bass Triangle',
      kind: 'native-synth' as const,
      gain: 0.55,
      pan: -0.15,
      waveform: 'triangle' as const,
      envelope: { attackSeconds: 0.01, decaySeconds: 0.12, sustain: 0.6, releaseSeconds: 0.2 },
    },
    {
      id: 'instrument-lead',
      name: 'Lead Saw',
      kind: 'native-synth' as const,
      gain: 0.4,
      pan: 0.25,
      waveform: 'sawtooth' as const,
      envelope: { attackSeconds: 0.005, decaySeconds: 0.09, sustain: 0.45, releaseSeconds: 0.14 },
    },
    {
      id: 'instrument-pad',
      name: 'Pad Sine',
      kind: 'native-synth' as const,
      gain: 0.35,
      pan: -0.4,
      waveform: 'sine' as const,
      envelope: { attackSeconds: 0.04, decaySeconds: 0.2, sustain: 0.8, releaseSeconds: 0.35 },
    },
    {
      id: 'instrument-kit',
      name: 'Pulse Kit',
      kind: 'native-drum' as const,
      gain: 0.5,
      pan: 0.4,
      voice: 'hat' as const,
    },
  ],
  parts: [
    {
      id: 'part-bass',
      name: 'Ring Bass',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'note' as const,
      encounterQuery: {
        kinds: ['boundary-crossing' as const],
        wheelIds: ['wheel-1'],
        headIds: [],
        fieldIds: ['field-rings'],
        boundaryIds: [],
        directions: [],
        minStrength: 0,
      },
      instrumentId: 'instrument-bass',
      onset: { kind: 'encounter-time' as const },
      pitch: { kind: 'boundary-degree' as const, root: 36, scale: 'pentatonic-minor' as const, octaves: 2 },
      velocity: { kind: 'encounter-strength' as const, min: 55, max: 118, gamma: 1 },
      duration: { kind: 'fixed' as const, beats: 0.5 },
      quantize: { gridBeats: 0.5, strength: 1 },
    },
    {
      id: 'part-lead',
      name: 'Ring Lead',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'note' as const,
      encounterQuery: {
        kinds: ['boundary-crossing' as const],
        wheelIds: ['wheel-2', 'wheel-4'],
        headIds: [],
        fieldIds: ['field-rings'],
        boundaryIds: [],
        directions: ['outward' as const],
        minStrength: 0,
      },
      instrumentId: 'instrument-lead',
      onset: { kind: 'encounter-time' as const },
      pitch: { kind: 'spatial' as const, source: 'radius' as const, root: 60, scale: 'pentatonic-minor' as const, octaves: 3 },
      velocity: { kind: 'encounter-strength' as const, min: 45, max: 112, gamma: 1.1 },
      duration: { kind: 'until-next' as const, maxBeats: 1 },
      quantize: { gridBeats: 0.25, strength: 1 },
    },
    {
      id: 'part-pad',
      name: 'Spoke Pad',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'note' as const,
      encounterQuery: {
        kinds: ['boundary-crossing' as const],
        wheelIds: ['wheel-3'],
        headIds: [],
        fieldIds: ['field-spokes'],
        boundaryIds: [],
        directions: [],
        minStrength: 0,
      },
      instrumentId: 'instrument-pad',
      onset: { kind: 'encounter-time' as const },
      pitch: { kind: 'boundary-degree' as const, root: 55, scale: 'dorian' as const, octaves: 2 },
      velocity: { kind: 'constant' as const, value: 78 },
      duration: { kind: 'fixed' as const, beats: 1.5 },
    },
    {
      id: 'part-kit',
      name: 'Spoke Pulse',
      enabled: true,
      mute: false,
      solo: false,
      kind: 'note' as const,
      encounterQuery: {
        kinds: ['boundary-crossing' as const],
        wheelIds: ['wheel-1', 'wheel-2', 'wheel-3', 'wheel-4'],
        headIds: [],
        fieldIds: ['field-spokes'],
        boundaryIds: [],
        directions: ['counterclockwise' as const],
        minStrength: 0.15,
      },
      instrumentId: 'instrument-kit',
      onset: { kind: 'encounter-time' as const },
      pitch: { kind: 'fixed-midi' as const, note: 42 },
      velocity: { kind: 'encounter-strength' as const, min: 50, max: 120, gamma: 1 },
      duration: { kind: 'fixed' as const, beats: 0.25 },
      quantize: { gridBeats: 0.25, strength: 1 },
    },
  ],
} satisfies Composition
