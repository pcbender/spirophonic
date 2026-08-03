import {
  familyDefaults,
  type CurveFamily,
  type DrumVoice,
  type SpirophonicModel,
} from './model'

const voiceGeometry = (
  family: CurveFamily,
  overrides: Partial<SpirophonicModel['geometry']> = {},
): SpirophonicModel['geometry'] => ({
  ...familyDefaults,
  family,
  fixedRadius: 180,
  movingRadius: 65,
  penOffset: 95,
  phase: 0,
  rotation: 'inside',
  samples: 900,
  ...overrides,
})

/**
 * A kit that shows the idea on first load: one rose gives five kicks, and a
 * single 3:2 lissajous drives hats and snare off its two axes, so the
 * polyrhythm is one shape read two ways.
 */
export const defaultVoices: Array<DrumVoice> = [
  {
    id: 'kick-rose',
    name: 'Kick',
    enabled: true,
    geometry: voiceGeometry('rose', { roseN: 5, roseD: 1 }),
    trigger: { source: 'radius-max' },
    note: 36,
    velocity: { min: 72, max: 120, gamma: 1 },
    quantize: { divisions: 16, strength: 1 },
  },
  {
    id: 'hat-lissajous-x',
    name: 'Closed hat',
    enabled: true,
    geometry: voiceGeometry('lissajous', { lissFreqX: 3, lissFreqY: 2 }),
    trigger: { source: 'zero-x' },
    note: 42,
    velocity: { min: 40, max: 88, gamma: 1.4 },
    quantize: { divisions: 16, strength: 1 },
  },
  {
    id: 'snare-lissajous-y',
    name: 'Snare',
    enabled: true,
    geometry: voiceGeometry('lissajous', { lissFreqX: 3, lissFreqY: 2 }),
    trigger: { source: 'zero-y' },
    note: 38,
    velocity: { min: 56, max: 104, gamma: 1 },
    quantize: { divisions: 16, strength: 1 },
  },
]

export const defaultModel: SpirophonicModel = {
  id: 'default-simple-flower',
  name: 'Simple Flower',
  version: '0.2',
  geometry: {
    ...familyDefaults,
    fixedRadius: 180,
    movingRadius: 65,
    penOffset: 95,
    phase: 0,
    rotation: 'inside',
    samples: 900,
  },
  time: {
    cyclesPerSecond: 0.2,
    durationSeconds: 8,
  },
  sound: {
    enabled: false,
    baseFrequencyHz: 220,
    frequencyMode: 'radius',
    minFrequencyHz: 110,
    maxFrequencyHz: 660,
    waveform: 'sine',
  },
  color: {
    hueSource: 'angle',
    saturation: 82,
    lightness: 58,
  },
  voices: defaultVoices,
}
