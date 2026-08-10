import { describe, expect, it } from 'vitest'

import type {
  Composition,
  HeadSpec,
  RingFieldSpec,
  SpokeFieldSpec,
} from '../core/composition'
import { defaultComposition } from '../core/defaultComposition'
import type { GateModulationLane } from '../core/gateModulation'
import {
  buildCompositionDrawCommands,
  buildCompositionScene,
  fitSpaceProjection,
  projectSpacePoint,
  sceneSpacePoints,
  type ObservationInterval,
} from './compositionRenderer'

const observation: ObservationInterval = {
  startSeconds: 0,
  endSeconds: 2,
  sampleRateHz: 4,
}

const compositionWithTwoHeads = (): Composition => {
  const composition: Composition = structuredClone(defaultComposition)
  composition.fields = []
  composition.parts = []
  const first = composition.wheels[0].heads[0]
  const second: HeadSpec = {
    ...structuredClone(first),
    id: 'head-2',
    name: 'Head 2',
    phaseOffset: 0.25,
    attachment: { kind: 'spirogram', penOffset: 60 },
    trace: {
      ...structuredClone(first.trace),
      color: '#f2c14e',
      lineWidth: 3,
      opacity: 0.6,
      mode: 'full',
      historySeconds: 1,
    },
  }

  first.trace = {
    ...first.trace,
    color: '#42cafd',
    mode: 'animated',
    historySeconds: 0.5,
  }
  composition.wheels[0].heads.push(second)

  return composition
}

const fields = (): [RingFieldSpec, SpokeFieldSpec] => [
  {
    id: 'rings-1',
    name: 'Rings',
    enabled: true,
    kind: 'rings',
    center: { x: 10, y: -5 },
    boundaries: [
      {
        id: 'ring-1',
        name: 'Inner',
        enabled: true,
        index: 0,
        kind: 'ring',
        radius: 40,
      },
    ],
  },
  {
    id: 'spokes-1',
    name: 'Spokes',
    enabled: true,
    kind: 'spokes',
    center: { x: 10, y: -5 },
    rotation: Math.PI / 4,
    boundaries: [
      {
        id: 'spoke-1',
        name: 'North',
        enabled: true,
        index: 0,
        kind: 'spoke',
        angle: Math.PI / 4,
        length: 120,
      },
    ],
  },
]

describe('Composition scene snapshots', () => {
  it('preserves Wheel and Head order with independent Trace styles', () => {
    const scene = buildCompositionScene(
      compositionWithTwoHeads(),
      2,
      observation,
    )

    expect(scene.traces.map((trace) => trace.headId)).toEqual([
      'head-1',
      'head-2',
    ])
    expect(scene.traces[0].style.color).toBe('#42cafd')
    expect(scene.traces[1].style).toMatchObject({
      color: '#f2c14e',
      lineWidth: 3,
      opacity: 0.6,
    })
    expect(scene.traces[0].head.wheelPhase).toBe(
      scene.traces[1].head.wheelPhase,
    )
    expect(scene.traces[0].head.position).not.toEqual(
      scene.traces[1].head.position,
    )
  })

  it('samples full and animated Traces over explicit intervals', () => {
    const scene = buildCompositionScene(
      compositionWithTwoHeads(),
      2,
      observation,
    )

    expect(scene.traces[0].points.map((point) => point.timeSeconds)).toEqual([
      1.5,
      1.75,
      2,
    ])
    expect(scene.traces[1].points).toHaveLength(9)
    expect(scene.traces[1].points[0].timeSeconds).toBe(0)
    expect(scene.traces[1].points.at(-1)?.timeSeconds).toBe(2)
  })

  it('supports explicit full and animated Trace switches', () => {
    const composition = compositionWithTwoHeads()
    const full = buildCompositionScene(composition, 2, observation, {
      traceMode: 'full',
    })
    const animated = buildCompositionScene(composition, 2, observation, {
      traceMode: 'animated',
    })

    expect(full.traces.map((trace) => trace.points.length)).toEqual([9, 9])
    expect(animated.traces.map((trace) => trace.points.length)).toEqual([3, 5])
  })

  it('produces the same image-state data when seeking or playing to a time', () => {
    const composition = compositionWithTwoHeads()
    const direct = buildCompositionScene(composition, 1.5, observation)
    let played = buildCompositionScene(composition, 0, observation)

    for (const timeSeconds of [0.5, 1, 1.5]) {
      played = buildCompositionScene(composition, timeSeconds, observation)
    }

    expect(played).toEqual(direct)
  })

  it('returns frozen renderer inputs instead of mutable pen state', () => {
    const scene = buildCompositionScene(
      compositionWithTwoHeads(),
      1,
      observation,
    )

    expect(Object.isFrozen(scene)).toBe(true)
    expect(Object.isFrozen(scene.traces)).toBe(true)
    expect(Object.isFrozen(scene.traces[0])).toBe(true)
    expect(Object.isFrozen(scene.traces[0].points)).toBe(true)
    expect(Object.isFrozen(scene.traces[0].points[0].position)).toBe(true)
  })
})

describe('Space projection and draw commands', () => {
  it('fits and centers Space coordinates with an inverted canvas y-axis', () => {
    const projection = fitSpaceProjection(
      { center: { x: 10, y: -5 }, scale: 1 },
      [
        { x: -90, y: -5 },
        { x: 110, y: -5 },
      ],
      { width: 240, height: 240, padding: 20 },
    )

    expect(projection.pixelsPerUnit).toBe(1)
    expect(projectSpacePoint({ x: 10, y: -5 }, projection)).toEqual({
      x: 120,
      y: 120,
    })
    expect(projectSpacePoint({ x: 110, y: 45 }, projection)).toEqual({
      x: 220,
      y: 70,
    })
  })

  it('changes projection on resize without changing sampled state', () => {
    const scene = buildCompositionScene(
      compositionWithTwoHeads(),
      1,
      observation,
    )
    const before = structuredClone(scene)
    const points = sceneSpacePoints(scene)
    const small = fitSpaceProjection(
      { center: { x: 0, y: 0 }, scale: 1 },
      points,
      { width: 240, height: 240, padding: 20 },
    )
    const large = fitSpaceProjection(
      { center: { x: 0, y: 0 }, scale: 1 },
      points,
      { width: 480, height: 480, padding: 20 },
    )

    expect(large.pixelsPerUnit).toBeGreaterThan(small.pixelsPerUnit)
    expect(scene).toEqual(before)
  })

  it('emits stable commands rather than pixel assertions', () => {
    const composition = compositionWithTwoHeads()
    const scene = buildCompositionScene(composition, 2, observation)
    const projection = fitSpaceProjection(
      composition.space,
      sceneSpacePoints(scene),
      { width: 320, height: 320, padding: 24 },
    )
    const commands = buildCompositionDrawCommands(scene, projection, {
      showDebugIds: true,
    })

    expect(commands.map((command) => command.kind)).toEqual([
      'clear',
      'trace',
      'head',
      'label',
      'trace',
      'head',
      'label',
    ])
    expect(commands.filter((command) => command.kind === 'trace')).toMatchObject([
      { wheelId: 'wheel-1', headId: 'head-1', color: '#42cafd' },
      { wheelId: 'wheel-1', headId: 'head-2', color: '#f2c14e' },
    ])
  })

  it('splits only the inside-gate Trace segment and styles it from the lane', () => {
    const composition = compositionWithTwoHeads()
    composition.wheels[0].heads[0].trace.mode = 'full'
    const unmodulated = buildCompositionScene(composition, 2, observation)
    const sourcePoints = unmodulated.traces[0].points.slice(2, 7)
    const lane = (
      id: string,
      target: GateModulationLane['target'],
    ): GateModulationLane =>
      Object.freeze({
        id,
        mappingId: `mapping-${target}`,
        noteEventId: 'note-gate',
        sourceEncounterId: 'entry-gate',
        exitEncounterId: 'exit-gate',
        partId: 'part-gate',
        instrumentId: 'instrument-1',
        wheelId: 'wheel-1',
        headId: 'head-1',
        fieldId: 'field-wedge',
        boundaryId: 'wedge-1',
        source: 'speed',
        target,
        sampleRateHz: 4,
        minimum: 0,
        maximum: 1,
        curve: 1,
        smoothingSeconds: 0,
        entryOnly: false,
        startSeconds: sourcePoints[0].timeSeconds,
        endSeconds: sourcePoints.at(-1)?.timeSeconds ?? 0,
        truncated: false,
        samples: Object.freeze(
          sourcePoints.map((point, index) =>
            Object.freeze({
              timeSeconds: point.timeSeconds,
              position: point.position,
              sourceValue: index / (sourcePoints.length - 1),
              normalizedValue: index / (sourcePoints.length - 1),
              value: index / (sourcePoints.length - 1),
            }),
          ),
        ),
      })
    const lanes = [lane('lane-brightness', 'brightness'), lane('lane-gain', 'gain')]
    const scene = buildCompositionScene(composition, 2, observation, {
      modulationLanes: lanes,
    })
    const projection = fitSpaceProjection(
      composition.space,
      sceneSpacePoints(scene),
      { width: 320, height: 320, padding: 24 },
    )
    const commands = buildCompositionDrawCommands(scene, projection)
    const traces = commands.filter((command) => command.kind === 'trace')
    const modulated = traces.filter(
      (command) => command.modulationLaneIds !== undefined,
    )

    expect(traces).toHaveLength(sourcePoints.length + 2)
    expect(modulated).toHaveLength(sourcePoints.length - 1)
    expect(modulated[0]).toMatchObject({
      headId: 'head-1',
      modulationLaneIds: ['lane-brightness', 'lane-gain'],
      modulationTargets: ['brightness', 'gain'],
    })
    if (modulated.some((command) => command.kind !== 'trace')) return
    expect(new Set(modulated.map((command) => command.color)).size).toBeGreaterThan(1)
    expect(modulated.at(-1)?.lineWidth ?? 0).toBeGreaterThan(
      modulated[0].lineWidth,
    )
    expect(modulated[0].color).not.toBe(
      composition.wheels[0].heads[0].trace.color,
    )
    expect(modulated[0].lineWidth).not.toBe(
      composition.wheels[0].heads[0].trace.lineWidth,
    )
    expect(modulated.at(-1)?.lineWidth ?? 0).toBeGreaterThan(
      composition.wheels[0].heads[0].trace.lineWidth,
    )
    expect(modulated[0].points[0]).toEqual(
      projectSpacePoint(sourcePoints[0].position, projection),
    )
    expect(modulated.at(-1)?.points.at(-1)).toEqual(
      projectSpacePoint(sourcePoints.at(-1)?.position ?? { x: 0, y: 0 }, projection),
    )
    expect(
      traces
        .filter((command) => command.modulationLaneIds === undefined)
        .every(
          (command) =>
            !modulated.some((segment) => command.color === segment.color),
        ),
    ).toBe(true)
  })

  it('switches Traces, Head markers, and debug IDs independently', () => {
    const composition = compositionWithTwoHeads()
    const scene = buildCompositionScene(composition, 1, observation)
    const projection = fitSpaceProjection(
      composition.space,
      sceneSpacePoints(scene),
      { width: 320, height: 320 },
    )
    const commands = buildCompositionDrawCommands(scene, projection, {
      showTraces: false,
      showHeads: false,
      showDebugIds: true,
    })

    expect(commands.map((command) => command.kind)).toEqual([
      'clear',
      'label',
      'label',
    ])
  })

  it('renders active ring and oriented-spoke geometry before Traces', () => {
    const composition = compositionWithTwoHeads()
    composition.fields = fields()
    const scene = buildCompositionScene(composition, 1, observation)
    const projection = fitSpaceProjection(
      composition.space,
      sceneSpacePoints(scene),
      { width: 320, height: 320, padding: 24 },
    )
    const commands = buildCompositionDrawCommands(scene, projection, {
      showBoundaryLabels: true,
    })
    const ring = commands.find((command) => command.kind === 'ring-boundary')
    const spoke = commands.find((command) => command.kind === 'spoke-boundary')

    expect(commands.slice(0, 5).map((command) => command.kind)).toEqual([
      'clear',
      'ring-boundary',
      'boundary-label',
      'spoke-boundary',
      'boundary-label',
    ])
    expect(ring).toMatchObject({
      fieldId: 'rings-1',
      boundaryId: 'ring-1',
      radius: 40 * projection.pixelsPerUnit,
    })
    expect(spoke).toMatchObject({
      fieldId: 'spokes-1',
      boundaryId: 'spoke-1',
      from: projectSpacePoint({ x: 10, y: -5 }, projection),
    })
    if (spoke?.kind !== 'spoke-boundary') return
    expect(spoke.to.x).toBeCloseTo(spoke.from.x, 12)
    expect(spoke.to.y).toBeLessThan(spoke.from.y)
    expect(
      Math.hypot(spoke.to.x - spoke.from.x, spoke.to.y - spoke.from.y),
    ).toBeCloseTo(120 * projection.pixelsPerUnit, 12)
  })

  it('renders a positive-width spoke as a filled wedge with two edges', () => {
    const composition = compositionWithTwoHeads()
    const [, spokeField] = fields()
    spokeField.boundaries[0].angularWidth = Math.PI / 6
    composition.fields = [spokeField]
    const scene = buildCompositionScene(composition, 1, observation)
    const projection = fitSpaceProjection(
      composition.space,
      sceneSpacePoints(scene),
      { width: 320, height: 320, padding: 24 },
    )
    const commands = buildCompositionDrawCommands(scene, projection)
    const wedge = commands.find((command) => command.kind === 'wedge-boundary')

    expect(wedge).toMatchObject({
      kind: 'wedge-boundary',
      fieldId: 'spokes-1',
      boundaryId: 'spoke-1',
      fillOpacity: 0.22,
    })
    if (wedge?.kind !== 'wedge-boundary') return
    expect(
      Math.hypot(
        wedge.left.x - wedge.center.x,
        wedge.left.y - wedge.center.y,
      ),
    ).toBeCloseTo(120 * projection.pixelsPerUnit, 12)
    expect(
      Math.hypot(
        wedge.right.x - wedge.center.x,
        wedge.right.y - wedge.center.y,
      ),
    ).toBeCloseTo(120 * projection.pixelsPerUnit, 12)
    expect(
      commands.some((command) => command.kind === 'spoke-boundary'),
    ).toBe(false)
  })

  it('emits no commands for disabled Fields or Boundaries', () => {
    const composition = compositionWithTwoHeads()
    const [rings, spokes] = fields()
    rings.enabled = false
    spokes.boundaries[0].enabled = false
    composition.fields = [rings, spokes]
    const scene = buildCompositionScene(composition, 1, observation)
    const projection = fitSpaceProjection(
      composition.space,
      sceneSpacePoints(scene),
      { width: 320, height: 320 },
    )
    const commands = buildCompositionDrawCommands(scene, projection)

    expect(scene.boundaries).toEqual([])
    expect(
      commands.some(
        (command) =>
          command.kind === 'ring-boundary' || command.kind === 'spoke-boundary',
      ),
    ).toBe(false)
  })
})
