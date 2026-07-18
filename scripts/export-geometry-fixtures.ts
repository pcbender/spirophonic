import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defaultModel } from '../src/core/defaultModel.ts'
import { generateSpiroPoints } from '../src/core/trochoid.ts'

const cases = [
  {
    name: 'inside_default_relationship',
    geometry: {
      fixedRadius: 180,
      movingRadius: 65,
      penOffset: 95,
      phase: 0,
      rotation: 'inside' as const,
      samples: 17,
    },
  },
  {
    name: 'outside_with_phase',
    geometry: {
      fixedRadius: 120,
      movingRadius: 36,
      penOffset: 44,
      phase: Math.PI / 7,
      rotation: 'outside' as const,
      samples: 19,
    },
  },
  {
    name: 'rounded_cycle_radii',
    geometry: {
      fixedRadius: 180.4,
      movingRadius: 64.6,
      penOffset: 72.5,
      phase: -0.375,
      rotation: 'inside' as const,
      samples: 12.6,
    },
  },
]

export const exportGeometryFixtures = () => {
  const fixture = {
    version: 1,
    source: 'src/core/trochoid.ts',
    generatedBy: 'npm run fixtures:geometry',
    cases: cases.map(({ name, geometry }) => ({
      name,
      geometry,
      points: generateSpiroPoints({ ...defaultModel, geometry }),
    })),
  }

  const destination = resolve('tests/fixtures/trochoid-golden.json')
  writeFileSync(destination, `${JSON.stringify(fixture, null, 2)}\n`)
}
