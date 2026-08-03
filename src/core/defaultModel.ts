import {
  familyDefaults,
  type PitchOptions,
  type SpirophonicModel,
  type Voice,
} from './model'
import { percussionChannel } from './voices'

const defaultPitch: PitchOptions = {
  source: 'radius',
  scale: 'pentatonic-minor',
  root: 48,
  octaves: 2,
}



/**
 * A kit that shows the idea on first load: one rose gives five kicks, and a
 * single 3:2 lissajous drives hats and snare off its two axes, so the
 * polyrhythm is one shape read two ways.
 */
export const defaultVoices: Array<Voice> = [
  {
    id: 'kick-rose',
    name: 'Kick',
    enabled: true,
    kind: 'percussion',
    channel: percussionChannel,
    pitch: defaultPitch,
    color: '#f2c14e',
    geometry: { family: 'rose', roseN: 5, roseD: 1 },
    trigger: { source: 'radius-max' },
    note: 36,
    velocity: { min: 72, max: 120, gamma: 1 },
    quantize: { divisions: 16, strength: 1 },
    gate: 1,
  },
  {
    id: 'hat-lissajous-x',
    name: 'Closed hat',
    enabled: true,
    kind: 'percussion',
    channel: percussionChannel,
    pitch: defaultPitch,
    color: '#6fd6c2',
    geometry: { family: 'lissajous', lissFreqX: 3, lissFreqY: 2 },
    trigger: { source: 'zero-x' },
    note: 42,
    velocity: { min: 40, max: 88, gamma: 1.4 },
    quantize: { divisions: 16, strength: 1 },
    gate: 1,
  },
  {
    id: 'snare-lissajous-y',
    name: 'Snare',
    enabled: true,
    kind: 'percussion',
    channel: percussionChannel,
    pitch: defaultPitch,
    color: '#e2718a',
    geometry: { family: 'lissajous', lissFreqX: 3, lissFreqY: 2 },
    trigger: { source: 'zero-y' },
    note: 38,
    velocity: { min: 56, max: 104, gamma: 1 },
    quantize: { divisions: 16, strength: 1 },
    gate: 1,
  },
  {
    id: 'pad-harmonograph',
    name: 'Pad',
    enabled: false,
    kind: 'pitched',
    channel: 0,
    program: 89, // GM pad 2 (warm)
    geometry: { family: 'harmonograph' },
    trigger: { source: 'radius-max', maxEvents: 12 },
    note: 48,
    pitch: { source: 'radius', scale: 'pentatonic-minor', root: 48, octaves: 2 },
    velocity: { min: 40, max: 92, gamma: 1.2 },
    quantize: { divisions: 16, strength: 0.6 },
    gate: 1,
    color: '#8f7ff0',
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
