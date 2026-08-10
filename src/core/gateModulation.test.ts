import { describe, expect, it } from 'vitest'

import type { GateModulationMapping } from './composition'
import {
  compileGateModulationLane,
  gateModulationLimits,
} from './gateModulation'
import {
  speedMapping,
  fixedFrequencySineGateFixture,
} from '../test/fixtures/gateModulation'

const compileFixture = (
  radius: number,
  mapping: GateModulationMapping = speedMapping,
  maxSamples?: number,
) => {
  const fixture = fixedFrequencySineGateFixture(radius)
  const lane = compileGateModulationLane({
    mapping,
    note: fixture.note,
    entry: fixture.entry,
    exit: fixture.exit,
    boundaryAt: () => fixture.boundary,
    stateAt: fixture.stateAt,
    referenceDistance: 180,
    maxSamples,
  })
  if (!lane) throw new Error('Expected the fixture mapping to compile.')
  return { fixture, lane }
}

const turningPoints = (values: ReadonlyArray<number>) => {
  let count = 0
  for (let index = 1; index < values.length - 1; index += 1) {
    const before = values[index] - values[index - 1]
    const after = values[index + 1] - values[index]
    if (before * after < 0) count += 1
  }
  return count
}

describe('gate modulation lanes', () => {
  it('samples entry and exit exactly once with stable bounded output', () => {
    const first = compileFixture(50)
    const second = compileFixture(50)

    expect(second.lane).toEqual(first.lane)
    expect(first.lane.id).toContain(first.fixture.note.id)
    expect(first.lane.sourceEncounterId).toBe(first.fixture.entry.id)
    expect(first.lane.exitEncounterId).toBe(first.fixture.exit.id)
    expect(first.lane.samples[0].timeSeconds).toBe(
      first.fixture.entry.timeSeconds,
    )
    expect(first.lane.samples.at(-1)?.timeSeconds).toBe(
      first.fixture.exit.timeSeconds,
    )
    expect(
      first.lane.samples.filter(
        (sample) => sample.timeSeconds === first.fixture.entry.timeSeconds,
      ),
    ).toHaveLength(1)
    expect(
      first.lane.samples.filter(
        (sample) => sample.timeSeconds === first.fixture.exit.timeSeconds,
      ),
    ).toHaveLength(1)
    for (const sample of first.lane.samples) {
      expect(Number.isFinite(sample.value)).toBe(true)
      expect(sample.value).toBeGreaterThanOrEqual(0)
      expect(sample.value).toBeLessThanOrEqual(1)
    }
  })

  it('gives the farther fixed-frequency sine a longer lane and more cycles', () => {
    const near = compileFixture(50).lane
    const far = compileFixture(100).lane

    expect(far.endSeconds - far.startSeconds).toBeGreaterThan(
      near.endSeconds - near.startSeconds,
    )
    expect(far.samples.length).toBeGreaterThan(near.samples.length)
    expect(
      turningPoints(far.samples.map((sample) => sample.sourceValue)),
    ).toBeGreaterThan(
      turningPoints(near.samples.map((sample) => sample.sourceValue)),
    )
  })

  it('samples attack and initial velocity only when the gate opens', () => {
    for (const target of ['attack', 'initial-velocity'] as const) {
      const mapping: GateModulationMapping = {
        ...speedMapping,
        id: `mod-${target}`,
        target,
        minimum: target === 'attack' ? 0 : 1,
        maximum: target === 'attack' ? 2 : 127,
      }
      const { fixture, lane } = compileFixture(50, mapping)

      expect(lane.entryOnly).toBe(true)
      expect(lane.samples).toHaveLength(1)
      expect(lane.samples[0].timeSeconds).toBe(fixture.entry.timeSeconds)
    }
  })

  it('preserves entry and exit when a dense lane reaches its size limit', () => {
    const { fixture, lane } = compileFixture(100, speedMapping, 8)

    expect(lane.truncated).toBe(true)
    expect(lane.samples).toHaveLength(8)
    expect(lane.samples[0].timeSeconds).toBe(fixture.entry.timeSeconds)
    expect(lane.samples.at(-1)?.timeSeconds).toBe(fixture.exit.timeSeconds)
    expect(gateModulationLimits.maxSamplesPerLane).toBeGreaterThan(8)
  })
})
