import { defaultModel } from './defaultModel'
import type { SpirophonicModel } from './model'

const withModel = (
  patch: Omit<Partial<SpirophonicModel>, 'geometry' | 'time' | 'sound' | 'color'> & {
    geometry?: Partial<SpirophonicModel['geometry']>
    time?: Partial<SpirophonicModel['time']>
    sound?: Partial<SpirophonicModel['sound']>
    color?: Partial<SpirophonicModel['color']>
  },
): SpirophonicModel => ({
  ...defaultModel,
  ...patch,
  geometry: { ...defaultModel.geometry, ...patch.geometry },
  time: { ...defaultModel.time, ...patch.time },
  sound: { ...defaultModel.sound, ...patch.sound },
  color: { ...defaultModel.color, ...patch.color },
})

export const presets: Array<SpirophonicModel> = [
  defaultModel,
  withModel({
    id: 'orbit-knot',
    name: 'Orbit Knot',
    geometry: {
      fixedRadius: 210,
      movingRadius: 72,
      penOffset: 130,
      rotation: 'outside',
      samples: 1100,
    },
    time: { cyclesPerSecond: 0.14 },
    sound: { waveform: 'triangle', frequencyMode: 'angle' },
    color: { hueSource: 'velocity', saturation: 78, lightness: 62 },
  }),
  withModel({
    id: 'slow-breather',
    name: 'Slow Breather',
    geometry: {
      fixedRadius: 160,
      movingRadius: 96,
      penOffset: 58,
      phase: 0.35,
      samples: 760,
    },
    time: { cyclesPerSecond: 0.07 },
    sound: {
      baseFrequencyHz: 174,
      minFrequencyHz: 87,
      maxFrequencyHz: 392,
      waveform: 'sine',
    },
    color: { hueSource: 'radius', saturation: 64, lightness: 60 },
  }),
  withModel({
    id: 'fibonacci-ish',
    name: 'Fibonacci-ish',
    geometry: {
      fixedRadius: 233,
      movingRadius: 89,
      penOffset: 144,
      rotation: 'inside',
      samples: 1400,
    },
    time: { cyclesPerSecond: 0.12 },
    sound: { frequencyMode: 'ratio', waveform: 'triangle' },
    color: { hueSource: 'angle', saturation: 86, lightness: 57 },
  }),
  withModel({
    id: 'lingua-wheel-echo',
    name: 'Lingua Wheel Echo',
    geometry: {
      fixedRadius: 192,
      movingRadius: 48,
      penOffset: 112,
      phase: 0.78,
      samples: 960,
    },
    time: { cyclesPerSecond: 0.16 },
    sound: {
      baseFrequencyHz: 196,
      frequencyMode: 'y',
      waveform: 'sine',
    },
    color: { hueSource: 'curvature', saturation: 74, lightness: 61 },
  }),
]

