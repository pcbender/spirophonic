import { describe, expect, it } from 'vitest'

import { exportGeometryFixtures } from './export-geometry-fixtures'

describe('geometry fixture exporter', () => {
  it('exports fixtures from the TypeScript geometry engine', () => {
    expect(exportGeometryFixtures()).toBeUndefined()
  })
})
