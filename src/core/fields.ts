import type {
  BoundarySpecUnion,
  Composition,
  FieldMotionSpec,
  FieldSpec,
  Point2,
} from './composition'
import { normalizeCycleRate, transportAddressAtSeconds } from './transport'

export type BoundarySpec = BoundarySpecUnion

const TAU = Math.PI * 2

type GeometryBase = {
  fieldId: string
  boundaryId: string
  name: string
  index: number
  center: Readonly<Point2>
}

export type RingBoundaryGeometry = Readonly<
  GeometryBase & { kind: 'ring'; radius: number }
>

export type SpokeBoundaryGeometry = Readonly<
  GeometryBase & {
    kind: 'spoke'
    angle: number
    angularWidth: number
    direction: Readonly<Point2>
  }
>

export type EllipseBoundaryGeometry = Readonly<
  GeometryBase & {
    kind: 'ellipse'
    rotation: number
    semiMajor: number
    semiMinor: number
  }
>

export type BandBoundaryGeometry = Readonly<
  GeometryBase & {
    kind: 'band'
    innerRadius: number
    outerRadius: number
  }
>

export type GridBoundaryGeometry = Readonly<
  GeometryBase & {
    kind: 'grid'
    rotation: number
    axis: 'x' | 'y'
    offset: number
  }
>

export type SpiralBoundaryGeometry = Readonly<
  GeometryBase & {
    kind: 'spiral'
    rotation: number
    startRadius: number
    growthPerTurn: number
    turns: number
  }
>

export type BoundaryGeometry =
  | RingBoundaryGeometry
  | SpokeBoundaryGeometry
  | EllipseBoundaryGeometry
  | BandBoundaryGeometry
  | GridBoundaryGeometry
  | SpiralBoundaryGeometry

/**
 * A Field's placement at one instant. Static Fields return the same value at
 * every time, which is what keeps MG-05 ring and spoke fixtures unchanged.
 */
export type FieldPlacement = Readonly<{
  center: Readonly<Point2>
  rotation: number
}>

export const fieldMotionOf = (field: FieldSpec): FieldMotionSpec =>
  field.motion ?? { kind: 'fixed' }

/**
 * Resolves where a Field sits at an absolute time. Wheel-attached Fields read
 * the referenced Wheel's absolute state, so seeking to a time gives the same
 * placement as playing to it.
 */
export const fieldPlacementAt = (
  composition: Pick<Composition, 'fields' | 'wheels' | 'transport'>,
  field: FieldSpec,
  timeSeconds: number,
): FieldPlacement => {
  if (!Number.isFinite(timeSeconds)) {
    throw new RangeError('timeSeconds must be a finite number.')
  }

  const baseRotation = field.rotation ?? 0
  const motion = fieldMotionOf(field)

  if (motion.kind === 'fixed') {
    return Object.freeze({
      center: freezePoint(field.center),
      rotation: baseRotation,
    })
  }

  if (motion.kind === 'rotating') {
    return Object.freeze({
      center: freezePoint(field.center),
      rotation: baseRotation + TAU * motion.turnsPerSecond * timeSeconds,
    })
  }

  if (motion.kind === 'transport-rotating') {
    const rate = normalizeCycleRate(motion.rate)
    const { absoluteBeat } = transportAddressAtSeconds(
      composition.transport,
      timeSeconds,
    )
    return Object.freeze({
      center: freezePoint(field.center),
      rotation:
        baseRotation + TAU * absoluteBeat * (rate.cycles / rate.beats),
    })
  }

  const wheel = composition.wheels.find(
    (candidate) => candidate.id === motion.wheelId,
  )
  if (!wheel) {
    throw new RangeError(
      `Field "${field.id}" is attached to unknown Wheel "${motion.wheelId}".`,
    )
  }

  const rate = normalizeCycleRate(wheel.rate)
  const { absoluteBeat } = transportAddressAtSeconds(
    composition.transport,
    timeSeconds,
  )
  const directionSign = wheel.direction === 'reverse' ? -1 : 1
  const cyclePosition =
    wheel.phase + directionSign * absoluteBeat * (rate.cycles / rate.beats)

  return Object.freeze({
    // The Field's own centre is an offset from the Wheel it rides.
    center: freezePoint({
      x: wheel.center.x + field.center.x,
      y: wheel.center.y + field.center.y,
    }),
    rotation: motion.followRotation
      ? baseRotation + TAU * cyclePosition
      : baseRotation,
  })
}

export type BoundarySegmentCrossing = Readonly<{
  fieldId: string
  boundaryId: string
  kind: BoundarySpec['kind']
  fraction: number
  position: Readonly<Point2>
  fromDistance: number
  toDistance: number
}>

const epsilon = 1e-12

const freezePoint = (value: Point2): Readonly<Point2> =>
  Object.freeze({ x: value.x, y: value.y })

const assertFinitePoint = (value: Point2, name: string) => {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates.`)
  }
}

export const boundaryKindForField: Record<
  FieldSpec['kind'],
  BoundarySpec['kind']
> = {
  rings: 'ring',
  spokes: 'spoke',
  ellipses: 'ellipse',
  bands: 'band',
  grid: 'grid',
  spiral: 'spiral',
}

const assertMatchingBoundary = (field: FieldSpec, boundary: BoundarySpec) => {
  const expected = boundaryKindForField[field.kind]

  if (boundary.kind !== expected) {
    throw new RangeError(
      `Boundary kind "${boundary.kind}" does not match Field kind "${field.kind}".`,
    )
  }
}

/** Geometry for a Boundary at an explicit Field placement. */
export const boundaryGeometryAtPlacement = (
  field: FieldSpec,
  boundary: BoundarySpec,
  placement: FieldPlacement,
): BoundaryGeometry => {
  assertMatchingBoundary(field, boundary)

  const base = {
    fieldId: field.id,
    boundaryId: boundary.id,
    name: boundary.name,
    index: boundary.index,
    center: placement.center,
  }

  if (boundary.kind === 'ring') {
    return Object.freeze({ ...base, kind: 'ring', radius: boundary.radius })
  }

  if (boundary.kind === 'spoke') {
    const angle = placement.rotation + boundary.angle
    return Object.freeze({
      ...base,
      kind: 'spoke',
      angle,
      angularWidth: boundary.angularWidth ?? 0,
      direction: freezePoint({ x: Math.cos(angle), y: Math.sin(angle) }),
    })
  }

  if (boundary.kind === 'ellipse') {
    return Object.freeze({
      ...base,
      kind: 'ellipse',
      rotation: placement.rotation,
      semiMajor: boundary.radius,
      semiMinor:
        boundary.radius * Math.sqrt(1 - boundary.eccentricity ** 2),
    })
  }

  if (boundary.kind === 'band') {
    return Object.freeze({
      ...base,
      kind: 'band',
      innerRadius: boundary.innerRadius,
      outerRadius: boundary.outerRadius,
    })
  }

  if (boundary.kind === 'grid') {
    return Object.freeze({
      ...base,
      kind: 'grid',
      rotation: placement.rotation,
      axis: boundary.axis,
      offset: boundary.offset,
    })
  }

  return Object.freeze({
    ...base,
    kind: 'spiral',
    rotation: placement.rotation,
    startRadius: boundary.startRadius,
    growthPerTurn: boundary.growthPerTurn,
    turns: boundary.turns,
  })
}

/** Static-Field convenience used by drawing code and MG-05 era callers. */
export const boundaryGeometry = (
  field: FieldSpec,
  boundary: BoundarySpec,
): BoundaryGeometry =>
  boundaryGeometryAtPlacement(field, boundary, {
    center: freezePoint(field.center),
    rotation: field.rotation ?? 0,
  })

export type ActiveBoundary = Readonly<{
  field: FieldSpec
  boundary: BoundarySpec
}>

/** Enabled Field/Boundary pairs, independent of time. */
export const activeBoundaries = (
  composition: Pick<Composition, 'fields'>,
): ReadonlyArray<ActiveBoundary> => {
  const active: Array<ActiveBoundary> = []

  for (const field of composition.fields) {
    if (!field.enabled) continue
    for (const boundary of field.boundaries) {
      if (boundary.enabled) active.push(Object.freeze({ field, boundary }))
    }
  }

  return Object.freeze(active)
}

export const activeBoundaryGeometriesAt = (
  composition: Pick<Composition, 'fields' | 'wheels' | 'transport'>,
  timeSeconds: number,
): ReadonlyArray<BoundaryGeometry> =>
  Object.freeze(
    activeBoundaries(composition).map(({ field, boundary }) =>
      boundaryGeometryAtPlacement(
        field,
        boundary,
        fieldPlacementAt(composition, field, timeSeconds),
      ),
    ),
  )

export const activeBoundaryGeometries = (
  composition: Pick<Composition, 'fields'>,
): ReadonlyArray<BoundaryGeometry> =>
  Object.freeze(
    activeBoundaries(composition).map(({ field, boundary }) =>
      boundaryGeometry(field, boundary),
    ),
  )

export const ringSignedDistance = (
  center: Point2,
  radius: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('radius must be finite and positive.')
  }

  return Math.hypot(value.x - center.x, value.y - center.y) - radius
}

/** Positive values lie counterclockwise/left of the oriented spoke line. */
export const spokeSignedDistance = (
  center: Point2,
  angle: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(angle)) {
    throw new RangeError('angle must be finite.')
  }

  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  const relative = { x: value.x - center.x, y: value.y - center.y }

  return direction.x * relative.y - direction.y * relative.x
}

export const spokeRayCoordinate = (
  center: Point2,
  angle: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(angle)) {
    throw new RangeError('angle must be finite.')
  }

  return (
    (value.x - center.x) * Math.cos(angle) +
    (value.y - center.y) * Math.sin(angle)
  )
}

const signedAngleDifference = (from: number, to: number) => {
  const raw = (to - from) % TAU
  return raw > Math.PI ? raw - TAU : raw <= -Math.PI ? raw + TAU : raw
}

/**
 * Negative inside the angular wedge and positive outside. The angular gap is
 * scaled by radius so its magnitude remains a world-like spatial distance.
 * At the exact centre the value is zero because polar angle is undefined; the
 * crossing scanner treats a run on zero as overlap rather than inventing edge
 * transitions there.
 */
export const wedgeSignedDistance = (
  center: Point2,
  angle: number,
  angularWidth: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(angle)) {
    throw new RangeError('angle must be finite.')
  }
  if (
    !Number.isFinite(angularWidth) ||
    angularWidth <= 0 ||
    angularWidth > Math.PI
  ) {
    throw new RangeError('angularWidth must be finite, positive, and at most pi.')
  }

  const relative = { x: value.x - center.x, y: value.y - center.y }
  const radius = Math.hypot(relative.x, relative.y)
  if (radius <= epsilon) return 0
  const pointAngle = Math.atan2(relative.y, relative.x)
  const angularGap = Math.abs(signedAngleDifference(angle, pointAngle))
  return radius * (angularGap - angularWidth / 2)
}

/** Rotates a world point into the Field's own frame. */
const toLocal = (
  center: Point2,
  rotation: number,
  value: Point2,
): Point2 => {
  const dx = value.x - center.x
  const dy = value.y - center.y
  const cos = Math.cos(-rotation)
  const sin = Math.sin(-rotation)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

/**
 * Negative inside the ellipse, positive outside. The normalized level set is
 * scaled by the smaller semi-axis so the result is in world-like units and a
 * single spatial tolerance stays meaningful across families.
 */
export const ellipseSignedDistance = (
  center: Point2,
  rotation: number,
  semiMajor: number,
  semiMinor: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(semiMajor) || semiMajor <= 0) {
    throw new RangeError('semiMajor must be finite and positive.')
  }
  if (!Number.isFinite(semiMinor) || semiMinor <= 0) {
    throw new RangeError('semiMinor must be finite and positive.')
  }

  const local = toLocal(center, rotation, value)
  const normalized = Math.hypot(local.x / semiMajor, local.y / semiMinor)
  return (normalized - 1) * Math.min(semiMajor, semiMinor)
}

/** Negative inside the annulus, positive outside either edge. */
export const bandSignedDistance = (
  center: Point2,
  innerRadius: number,
  outerRadius: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(innerRadius) || innerRadius < 0) {
    throw new RangeError('innerRadius must be finite and non-negative.')
  }
  if (!Number.isFinite(outerRadius) || outerRadius <= innerRadius) {
    throw new RangeError('outerRadius must be finite and exceed innerRadius.')
  }

  const radius = Math.hypot(value.x - center.x, value.y - center.y)
  const middle = (innerRadius + outerRadius) / 2
  const halfWidth = (outerRadius - innerRadius) / 2
  return Math.abs(radius - middle) - halfWidth
}

export const gridSignedDistance = (
  center: Point2,
  rotation: number,
  axis: 'x' | 'y',
  offset: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(offset)) {
    throw new RangeError('offset must be finite.')
  }

  const local = toLocal(center, rotation, value)
  return (axis === 'x' ? local.x : local.y) - offset
}

/**
 * Radial distance to the nearest arm of an Archimedean spiral. Each of the
 * `turns` windings is a separate arm at the sampled angle; the nearest one wins,
 * which keeps the level set continuous across the angular branch cut.
 */
export const spiralSignedDistance = (
  center: Point2,
  rotation: number,
  startRadius: number,
  growthPerTurn: number,
  turns: number,
  value: Point2,
) => {
  assertFinitePoint(center, 'center')
  assertFinitePoint(value, 'value')
  if (!Number.isFinite(startRadius) || startRadius < 0) {
    throw new RangeError('startRadius must be finite and non-negative.')
  }
  if (!Number.isFinite(growthPerTurn) || growthPerTurn <= 0) {
    throw new RangeError('growthPerTurn must be finite and positive.')
  }
  if (!Number.isInteger(turns) || turns < 1) {
    throw new RangeError('turns must be a positive integer.')
  }

  const local = toLocal(center, rotation, value)
  const radius = Math.hypot(local.x, local.y)
  const theta = Math.atan2(local.y, local.x)
  const wrapped = (theta % TAU + TAU) % TAU
  let nearest = Number.POSITIVE_INFINITY

  for (let turn = 0; turn < turns; turn += 1) {
    const armRadius =
      startRadius + growthPerTurn * (wrapped / TAU + turn)
    const difference = radius - armRadius
    if (Math.abs(difference) < Math.abs(nearest)) nearest = difference
  }

  return nearest
}

export const boundarySignedDistance = (
  geometry: BoundaryGeometry,
  value: Point2,
) => {
  if (geometry.kind === 'ring') {
    return ringSignedDistance(geometry.center, geometry.radius, value)
  }
  if (geometry.kind === 'spoke') {
    return geometry.angularWidth > 0
      ? wedgeSignedDistance(
          geometry.center,
          geometry.angle,
          geometry.angularWidth,
          value,
        )
      : spokeSignedDistance(geometry.center, geometry.angle, value)
  }
  if (geometry.kind === 'ellipse') {
    return ellipseSignedDistance(
      geometry.center,
      geometry.rotation,
      geometry.semiMajor,
      geometry.semiMinor,
      value,
    )
  }
  if (geometry.kind === 'band') {
    return bandSignedDistance(
      geometry.center,
      geometry.innerRadius,
      geometry.outerRadius,
      value,
    )
  }
  if (geometry.kind === 'grid') {
    return gridSignedDistance(
      geometry.center,
      geometry.rotation,
      geometry.axis,
      geometry.offset,
      value,
    )
  }
  return spiralSignedDistance(
    geometry.center,
    geometry.rotation,
    geometry.startRadius,
    geometry.growthPerTurn,
    geometry.turns,
    value,
  )
}

/**
 * Per-family spatial tolerance multiplier. Ellipse and spiral level sets are
 * approximations of true Euclidean distance, so they need a looser zero band
 * than the exact ring, spoke, band, and grid solvers.
 */
export const boundaryToleranceScale = (
  geometry: BoundaryGeometry,
): number => {
  if (geometry.kind === 'ellipse') {
    return Math.max(1, geometry.semiMajor / Math.max(1e-9, geometry.semiMinor))
  }
  if (geometry.kind === 'spiral') {
    return 10
  }
  return 1
}

const interpolatePoint = (from: Point2, to: Point2, fraction: number) =>
  freezePoint({
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  })

export const segmentBoundaryCrossing = (
  field: FieldSpec,
  boundary: BoundarySpec,
  from: Point2,
  to: Point2,
): BoundarySegmentCrossing | null => {
  if (!field.enabled || !boundary.enabled) return null

  assertFinitePoint(from, 'from')
  assertFinitePoint(to, 'to')
  const geometry = boundaryGeometry(field, boundary)
  const fromDistance = boundarySignedDistance(geometry, from)
  const toDistance = boundarySignedDistance(geometry, to)
  const denominator = fromDistance - toDistance

  if (
    Math.abs(fromDistance) <= epsilon &&
    Math.abs(toDistance) <= epsilon
  ) {
    return null
  }
  if (fromDistance * toDistance > 0 || Math.abs(denominator) <= epsilon) {
    return null
  }

  const fraction = Math.min(1, Math.max(0, fromDistance / denominator))
  const position = interpolatePoint(from, to, fraction)

  if (
    geometry.kind === 'spoke' &&
    geometry.angularWidth === 0 &&
    spokeRayCoordinate(geometry.center, geometry.angle, position) < -epsilon
  ) {
    return null
  }

  return Object.freeze({
    fieldId: field.id,
    boundaryId: boundary.id,
    kind: boundary.kind,
    fraction,
    position,
    fromDistance,
    toDistance,
  })
}

const allFieldIds = (fields: ReadonlyArray<FieldSpec>) =>
  new Set(
    fields.flatMap((field) => [
      field.id,
      ...field.boundaries.map((boundary) => boundary.id),
    ]),
  )

const fieldAt = (fields: ReadonlyArray<FieldSpec>, fieldId: string) => {
  const field = fields.find((candidate) => candidate.id === fieldId)

  if (!field) throw new RangeError(`Unknown Field "${fieldId}".`)
  return field
}

export const addField = (
  fields: ReadonlyArray<FieldSpec>,
  field: FieldSpec,
): Array<FieldSpec> => {
  const ids = allFieldIds(fields)
  const fieldIds = [field.id, ...field.boundaries.map((item) => item.id)]
  const fieldIdSet = new Set<string>()
  const duplicate = fieldIds.find((id) => {
    if (ids.has(id) || fieldIdSet.has(id)) return true
    fieldIdSet.add(id)
    return false
  })

  if (duplicate) throw new RangeError(`Duplicate Field or Boundary ID "${duplicate}".`)
  if (field.boundaries.length === 0) {
    throw new RangeError('A Field must contain at least one Boundary.')
  }

  return [...fields, field]
}

export const removeField = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
) => {
  fieldAt(fields, fieldId)
  return fields.filter((field) => field.id !== fieldId)
}

export const updateField = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
  update: (field: FieldSpec) => FieldSpec,
): Array<FieldSpec> => {
  const current = fieldAt(fields, fieldId)
  const next = update(current)

  if (next.id !== current.id || next.kind !== current.kind) {
    throw new RangeError('Field identity and kind cannot change during an edit.')
  }

  return fields.map((field) => (field.id === fieldId ? next : field))
}

export const reorderField = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
  toIndex: number,
): Array<FieldSpec> => {
  const fromIndex = fields.findIndex((field) => field.id === fieldId)
  if (fromIndex < 0) throw new RangeError(`Unknown Field "${fieldId}".`)

  const next = [...fields]
  const [field] = next.splice(fromIndex, 1)
  next.splice(Math.min(next.length, Math.max(0, toIndex)), 0, field)
  return next
}

const reindexBoundaries = (boundaries: ReadonlyArray<BoundarySpec>) =>
  boundaries.map((boundary, index) => ({ ...boundary, index }))

/**
 * Every Field kind carries a homogeneous Boundary array whose element kind is
 * fixed by the Field kind, so these edits are kind-agnostic once
 * assertMatchingBoundary has run. The cast re-attaches the discriminated
 * correlation that spreading erases.
 */
const withBoundaries = (
  field: FieldSpec,
  boundaries: ReadonlyArray<BoundarySpec>,
): FieldSpec => ({ ...field, boundaries } as FieldSpec)

export const addBoundary = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
  boundary: BoundarySpec,
): Array<FieldSpec> => {
  if (allFieldIds(fields).has(boundary.id)) {
    throw new RangeError(`Duplicate Field or Boundary ID "${boundary.id}".`)
  }

  return updateField(fields, fieldId, (field) => {
    assertMatchingBoundary(field, boundary)
    return withBoundaries(
      field,
      reindexBoundaries([...field.boundaries, boundary]),
    )
  })
}

export const updateBoundary = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
  boundaryId: string,
  update: (boundary: BoundarySpec) => BoundarySpec,
): Array<FieldSpec> =>
  updateField(fields, fieldId, (field) => {
    const current = field.boundaries.find(
      (boundary) => boundary.id === boundaryId,
    )
    if (!current) throw new RangeError(`Unknown Boundary "${boundaryId}".`)

    const next = update(current)
    if (next.id !== current.id || next.kind !== current.kind) {
      throw new RangeError('Boundary identity and kind cannot change during an edit.')
    }
    assertMatchingBoundary(field, next)

    return withBoundaries(
      field,
      field.boundaries.map((boundary) =>
        boundary.id === boundaryId ? next : boundary,
      ),
    )
  })

export const removeBoundary = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
  boundaryId: string,
): Array<FieldSpec> =>
  updateField(fields, fieldId, (field) => {
    if (!field.boundaries.some((boundary) => boundary.id === boundaryId)) {
      throw new RangeError(`Unknown Boundary "${boundaryId}".`)
    }
    if (field.boundaries.length === 1) {
      throw new RangeError('A Field must retain at least one Boundary.')
    }

    return withBoundaries(
      field,
      reindexBoundaries(
        field.boundaries.filter((boundary) => boundary.id !== boundaryId),
      ),
    )
  })

export const reorderBoundary = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
  boundaryId: string,
  toIndex: number,
): Array<FieldSpec> =>
  updateField(fields, fieldId, (field) => {
    const fromIndex = field.boundaries.findIndex(
      (boundary) => boundary.id === boundaryId,
    )
    if (fromIndex < 0) throw new RangeError(`Unknown Boundary "${boundaryId}".`)

    const boundaries: Array<BoundarySpec> = [...field.boundaries]
    const [boundary] = boundaries.splice(fromIndex, 1)
    boundaries.splice(
      Math.min(boundaries.length, Math.max(0, toIndex)),
      0,
      boundary,
    )
    return withBoundaries(field, reindexBoundaries(boundaries))
  })

export const nextFieldId = (
  fields: ReadonlyArray<FieldSpec>,
  prefix: FieldSpec['kind'],
) => nextStableId(allFieldIds(fields), `field-${prefix}`)

export const nextBoundaryId = (
  fields: ReadonlyArray<FieldSpec>,
  fieldId: string,
) => nextStableId(allFieldIds(fields), `${fieldId}-boundary`)

const nextStableId = (ids: ReadonlySet<string>, prefix: string) => {
  let suffix = 1
  while (ids.has(`${prefix}-${suffix}`)) suffix += 1
  return `${prefix}-${suffix}`
}
