import {
  compositionVersion,
  type Composition,
} from './composition'

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
  fields: [],
  soundBanks: [],
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
