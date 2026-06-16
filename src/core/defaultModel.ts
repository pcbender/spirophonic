import type { SpirophonicModel } from './model'

export const defaultModel: SpirophonicModel = {
  id: 'default-simple-flower',
  name: 'Simple Flower',
  version: '0.1',
  geometry: {
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
}
