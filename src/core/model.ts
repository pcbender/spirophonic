export type RotationMode = 'inside' | 'outside'

export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth'

export type FrequencyMode = 'radius' | 'x' | 'y' | 'angle' | 'ratio'

export type HueSource = 'angle' | 'radius' | 'velocity' | 'curvature'

export type SpirophonicModel = {
  id: string
  name: string
  version: '0.1'
  geometry: {
    fixedRadius: number
    movingRadius: number
    penOffset: number
    phase: number
    rotation: RotationMode
    samples: number
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
}

