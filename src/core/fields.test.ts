import { describe, expect, it } from 'vitest'

import type {
  Composition,
  RingFieldSpec,
  SpokeFieldSpec,
} from './composition'
import { defaultComposition } from './defaultComposition'
import {
  activeBoundaryGeometries,
  addBoundary,
  addField,
  boundaryGeometry,
  boundarySignedDistance,
  nextBoundaryId,
  nextFieldId,
  removeBoundary,
  reorderBoundary,
  reorderField,
  ringSignedDistance,
  segmentBoundaryCrossing,
  spokeRayCoordinate,
  spokeSignedDistance,
  wedgeSignedDistance,
  updateBoundary,
  updateField,
} from './fields'

const rings = (): RingFieldSpec => ({
  id: 'field-rings-1',
  name: 'Five Rings',
  enabled: true,
  kind: 'rings',
  center: { x: 0, y: 0 },
  boundaries: Array.from({ length: 5 }, (_, index) => ({
    id: `ring-${index + 1}`,
    name: `Ring ${index + 1}`,
    enabled: true,
    index,
    kind: 'ring' as const,
    radius: (index + 1) * 20,
  })),
})

const spokes = (): SpokeFieldSpec => ({
  id: 'field-spokes-1',
  name: 'Four Spokes',
  enabled: true,
  kind: 'spokes',
  center: { x: 0, y: 0 },
  rotation: 0,
  boundaries: Array.from({ length: 4 }, (_, index) => ({
    id: `spoke-${index + 1}`,
    name: `Spoke ${index + 1}`,
    enabled: true,
    index,
    kind: 'spoke' as const,
    angle: (index * Math.PI) / 2,
    length: 100,
  })),
})

describe('Field geometry', () => {
  it('addresses five rings as five distinct explicit Boundaries', () => {
    const composition = {
      ...structuredClone(defaultComposition),
      fields: [rings()],
    } satisfies Composition

    expect(
      activeBoundaryGeometries(composition).map((item) => item.boundaryId),
    ).toEqual(['ring-1', 'ring-2', 'ring-3', 'ring-4', 'ring-5'])
  })

  it('uses negative distance inside a ring and positive outside', () => {
    expect(ringSignedDistance({ x: 0, y: 0 }, 10, { x: 6, y: 0 })).toBe(-4)
    expect(ringSignedDistance({ x: 0, y: 0 }, 10, { x: 13, y: 0 })).toBe(3)
  })

  it('uses Field rotation and Boundary angle in the same geometry object', () => {
    const field = spokes()
    field.rotation = Math.PI / 4
    field.boundaries[0].angle = Math.PI / 4
    const geometry = boundaryGeometry(field, field.boundaries[0])

    expect(geometry.kind).toBe('spoke')
    if (geometry.kind !== 'spoke') return

    expect(geometry.angle).toBe(Math.PI / 2)
    expect(geometry.direction.x).toBeCloseTo(0, 12)
    expect(geometry.direction.y).toBeCloseTo(1, 12)
    expect(boundarySignedDistance(geometry, { x: -2, y: 3 })).toBeCloseTo(2, 12)
  })

  it('treats a positive-width spoke as an angular region', () => {
    expect(
      wedgeSignedDistance(
        { x: 0, y: 0 },
        0,
        Math.PI / 3,
        20,
        { x: 10, y: 0 },
      ),
    ).toBeLessThan(0)
    expect(
      wedgeSignedDistance(
        { x: 0, y: 0 },
        0,
        Math.PI / 3,
        20,
        { x: 0, y: 10 },
      ),
    ).toBeGreaterThan(0)

    const field = spokes()
    field.boundaries[0].angularWidth = Math.PI / 3
    const geometry = boundaryGeometry(field, field.boundaries[0])
    expect(geometry).toMatchObject({
      kind: 'spoke',
      angularWidth: Math.PI / 3,
      length: 100,
    })
    expect(boundarySignedDistance(geometry, { x: 10, y: 0 })).toBeLessThan(0)
    expect(boundarySignedDistance(geometry, { x: 90, y: 0 })).toBeGreaterThan(0)
  })

  it('limits an oriented ray to the segment ahead of its Field centre', () => {
    const field = spokes()
    const boundary = field.boundaries[0]
    const ahead = segmentBoundaryCrossing(
      field,
      boundary,
      { x: 2, y: -1 },
      { x: 2, y: 1 },
    )
    const behind = segmentBoundaryCrossing(
      field,
      boundary,
      { x: -2, y: -1 },
      { x: -2, y: 1 },
    )
    const beyond = segmentBoundaryCrossing(
      field,
      boundary,
      { x: 101, y: -1 },
      { x: 101, y: 1 },
    )

    expect(ahead).toMatchObject({
      fieldId: 'field-spokes-1',
      boundaryId: 'spoke-1',
      kind: 'spoke',
      fraction: 0.5,
      position: { x: 2, y: 0 },
    })
    expect(behind).toBeNull()
    expect(beyond).toBeNull()
    expect(spokeRayCoordinate(field.center, 0, { x: -2, y: 0 })).toBe(-2)
  })

  it('returns stable signed sides for an oriented spoke', () => {
    expect(spokeSignedDistance({ x: 0, y: 0 }, 0, { x: 2, y: 1 })).toBe(1)
    expect(spokeSignedDistance({ x: 0, y: 0 }, 0, { x: 2, y: -1 })).toBe(-1)
  })

  it('finds an interpolated ring crossing', () => {
    const field = rings()
    const crossing = segmentBoundaryCrossing(
      field,
      field.boundaries[0],
      { x: 10, y: 0 },
      { x: 30, y: 0 },
    )

    expect(crossing).toMatchObject({
      boundaryId: 'ring-1',
      fraction: 0.5,
      position: { x: 20, y: 0 },
      fromDistance: -10,
      toDistance: 10,
    })
  })

  it('excludes disabled Fields and Boundaries from geometry and crossings', () => {
    const disabledField = rings()
    const partlyDisabled = rings()
    disabledField.enabled = false
    partlyDisabled.boundaries[1].enabled = false

    expect(activeBoundaryGeometries({ fields: [disabledField] })).toEqual([])
    expect(activeBoundaryGeometries({ fields: [partlyDisabled] })).toHaveLength(4)
    expect(
      segmentBoundaryCrossing(
        partlyDisabled,
        partlyDisabled.boundaries[1],
        { x: 30, y: 0 },
        { x: 50, y: 0 },
      ),
    ).toBeNull()
  })
})

describe('Field authoring operations', () => {
  it('preserves ring IDs when a sibling is edited and reordered', () => {
    const original = rings()
    const edited = updateBoundary(
      [original],
      original.id,
      'ring-2',
      (boundary) =>
        boundary.kind === 'ring' ? { ...boundary, radius: 45 } : boundary,
    )
    const reordered = reorderBoundary(edited, original.id, 'ring-5', 0)

    expect(edited[0].boundaries.map((item) => item.id)).toEqual([
      'ring-1',
      'ring-2',
      'ring-3',
      'ring-4',
      'ring-5',
    ])
    expect(reordered[0].boundaries.map((item) => item.id)).toEqual([
      'ring-5',
      'ring-1',
      'ring-2',
      'ring-3',
      'ring-4',
    ])
    expect(reordered[0].boundaries.map((item) => item.index)).toEqual([
      0, 1, 2, 3, 4,
    ])
  })

  it('adds, removes, enables, edits, and reorders without mutating input', () => {
    const source = [rings(), spokes()]
    const sourceSnapshot = structuredClone(source)
    const withBoundary = addBoundary(source, 'field-rings-1', {
      id: 'ring-6',
      name: 'Ring 6',
      enabled: true,
      index: 99,
      kind: 'ring',
      radius: 120,
    })
    const withoutBoundary = removeBoundary(
      withBoundary,
      'field-rings-1',
      'ring-2',
    )
    const disabled = updateField(withoutBoundary, 'field-spokes-1', (field) => ({
      ...field,
      enabled: false,
    }))
    const reordered = reorderField(disabled, 'field-spokes-1', 0)

    expect(source).toEqual(sourceSnapshot)
    expect(reordered.map((field) => field.id)).toEqual([
      'field-spokes-1',
      'field-rings-1',
    ])
    expect(reordered[0].enabled).toBe(false)
    expect(reordered[1].boundaries.map((item) => item.id)).toEqual([
      'ring-1',
      'ring-3',
      'ring-4',
      'ring-5',
      'ring-6',
    ])
  })

  it('adds Fields with explicit unique identities', () => {
    const field = rings()
    const repeatedBoundary = rings()
    repeatedBoundary.boundaries[1].id = repeatedBoundary.boundaries[0].id

    expect(addField([], field)).toEqual([field])
    expect(() => addField([field], rings())).toThrow('Duplicate')
    expect(() => addField([], repeatedBoundary)).toThrow('Duplicate')
  })

  it('allocates deterministic IDs without using display indices as identity', () => {
    const fields = [rings(), spokes()]

    expect(nextFieldId(fields, 'rings')).toBe('field-rings-2')
    expect(nextBoundaryId(fields, 'field-rings-1')).toBe(
      'field-rings-1-boundary-1',
    )
  })

  it('rejects identity changes and removal of a Field\'s final Boundary', () => {
    const oneRing = rings()
    oneRing.boundaries = [oneRing.boundaries[0]]

    expect(() =>
      updateBoundary([oneRing], oneRing.id, 'ring-1', (boundary) => ({
        ...boundary,
        id: 'replacement',
      })),
    ).toThrow('identity')
    expect(() => removeBoundary([oneRing], oneRing.id, 'ring-1')).toThrow(
      'at least one',
    )
  })
})
