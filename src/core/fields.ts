import type {
  Composition,
  FieldSpec,
  Point2,
  RingBoundarySpec,
  SpokeBoundarySpec,
} from './composition'

export type BoundarySpec = RingBoundarySpec | SpokeBoundarySpec

export type RingBoundaryGeometry = Readonly<{
  kind: 'ring'
  fieldId: string
  boundaryId: string
  name: string
  index: number
  center: Readonly<Point2>
  radius: number
}>

export type SpokeBoundaryGeometry = Readonly<{
  kind: 'spoke'
  fieldId: string
  boundaryId: string
  name: string
  index: number
  center: Readonly<Point2>
  angle: number
  direction: Readonly<Point2>
}>

export type BoundaryGeometry = RingBoundaryGeometry | SpokeBoundaryGeometry

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

const assertMatchingBoundary = (field: FieldSpec, boundary: BoundarySpec) => {
  const expected = field.kind === 'rings' ? 'ring' : 'spoke'

  if (boundary.kind !== expected) {
    throw new RangeError(
      `Boundary kind "${boundary.kind}" does not match Field kind "${field.kind}".`,
    )
  }
}

export const boundaryGeometry = (
  field: FieldSpec,
  boundary: BoundarySpec,
): BoundaryGeometry => {
  assertMatchingBoundary(field, boundary)

  if (field.kind === 'rings' && boundary.kind === 'ring') {
    return Object.freeze({
      kind: 'ring',
      fieldId: field.id,
      boundaryId: boundary.id,
      name: boundary.name,
      index: boundary.index,
      center: freezePoint(field.center),
      radius: boundary.radius,
    })
  }

  if (field.kind === 'spokes' && boundary.kind === 'spoke') {
    const angle = field.rotation + boundary.angle

    return Object.freeze({
      kind: 'spoke',
      fieldId: field.id,
      boundaryId: boundary.id,
      name: boundary.name,
      index: boundary.index,
      center: freezePoint(field.center),
      angle,
      direction: freezePoint({ x: Math.cos(angle), y: Math.sin(angle) }),
    })
  }

  throw new RangeError('Unsupported Field and Boundary combination.')
}

export const activeBoundaryGeometries = (
  composition: Pick<Composition, 'fields'>,
): ReadonlyArray<BoundaryGeometry> => {
  const geometries: Array<BoundaryGeometry> = []

  for (const field of composition.fields) {
    if (!field.enabled) continue

    for (const boundary of field.boundaries) {
      if (boundary.enabled) geometries.push(boundaryGeometry(field, boundary))
    }
  }

  return Object.freeze(geometries)
}

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

export const boundarySignedDistance = (
  geometry: BoundaryGeometry,
  value: Point2,
) =>
  geometry.kind === 'ring'
    ? ringSignedDistance(geometry.center, geometry.radius, value)
    : spokeSignedDistance(geometry.center, geometry.angle, value)

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

const reindexBoundaries = <T extends BoundarySpec>(boundaries: Array<T>) =>
  boundaries.map((boundary, index) => ({ ...boundary, index }))

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

    if (field.kind === 'rings' && boundary.kind === 'ring') {
      return {
        ...field,
        boundaries: reindexBoundaries([...field.boundaries, boundary]),
      }
    }
    if (field.kind === 'spokes' && boundary.kind === 'spoke') {
      return {
        ...field,
        boundaries: reindexBoundaries([...field.boundaries, boundary]),
      }
    }

    throw new RangeError('Unsupported Field and Boundary combination.')
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

    if (field.kind === 'rings' && next.kind === 'ring') {
      return {
        ...field,
        boundaries: field.boundaries.map((boundary) =>
          boundary.id === boundaryId ? next : boundary,
        ),
      }
    }
    if (field.kind === 'spokes' && next.kind === 'spoke') {
      return {
        ...field,
        boundaries: field.boundaries.map((boundary) =>
          boundary.id === boundaryId ? next : boundary,
        ),
      }
    }

    throw new RangeError('Unsupported Field and Boundary combination.')
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

    if (field.kind === 'rings') {
      return {
        ...field,
        boundaries: reindexBoundaries(
          field.boundaries.filter((boundary) => boundary.id !== boundaryId),
        ),
      }
    }

    return {
      ...field,
      boundaries: reindexBoundaries(
        field.boundaries.filter((boundary) => boundary.id !== boundaryId),
      ),
    }
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

    if (field.kind === 'rings') {
      const boundaries = [...field.boundaries]
      const [boundary] = boundaries.splice(fromIndex, 1)
      boundaries.splice(
        Math.min(boundaries.length, Math.max(0, toIndex)),
        0,
        boundary,
      )
      return { ...field, boundaries: reindexBoundaries(boundaries) }
    }

    const boundaries = [...field.boundaries]
    const [boundary] = boundaries.splice(fromIndex, 1)
    boundaries.splice(
      Math.min(boundaries.length, Math.max(0, toIndex)),
      0,
      boundary,
    )
    return { ...field, boundaries: reindexBoundaries(boundaries) }
  })

export const nextFieldId = (
  fields: ReadonlyArray<FieldSpec>,
  prefix: 'rings' | 'spokes',
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
