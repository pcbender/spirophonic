import type {
  Composition,
  HeadSpec,
  InstrumentSpec,
  PartSpec,
  WheelSpec,
} from './composition'

export type CompositionObjectKind = 'wheel' | 'head' | 'part' | 'instrument'

export type CompositionReference = Readonly<{
  /** Where the reference lives, as a validation-style path. */
  path: string
  /** Human-readable description of what would break. */
  description: string
}>

export type RemovalImpact = Readonly<{
  kind: CompositionObjectKind
  id: string
  name: string
  /** Objects removed outright along with the target. */
  cascadeRemovals: ReadonlyArray<CompositionReference>
  /** Objects that survive but lose a reference to the target. */
  referenceRewrites: ReadonlyArray<CompositionReference>
  /** Reasons the removal cannot proceed at all, even with a cascade. */
  blockers: ReadonlyArray<string>
}>

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

const freeze = <T>(values: Array<T>): ReadonlyArray<T> => Object.freeze(values)

/**
 * Every id in the Composition, across all object families. IDs are globally
 * unique in the v1 schema, so allocation has to consider all of them, not just
 * the siblings of the object being added.
 */
export const allCompositionIds = (
  composition: Composition,
): ReadonlySet<string> => {
  const ids = new Set<string>()
  // The Composition's own id shares the same namespace as everything in it.
  ids.add(composition.id)
  for (const wheel of composition.wheels) {
    ids.add(wheel.id)
    for (const head of wheel.heads) ids.add(head.id)
  }
  for (const field of composition.fields) {
    ids.add(field.id)
    for (const boundary of field.boundaries) ids.add(boundary.id)
  }
  for (const relation of composition.relations ?? []) ids.add(relation.id)
  for (const tuning of composition.tuningContexts ?? []) ids.add(tuning.id)
  for (const instrument of composition.instruments) ids.add(instrument.id)
  for (const part of composition.parts) {
    ids.add(part.id)
    if (part.kind === 'note') {
      for (const mapping of part.gateModulations ?? []) ids.add(mapping.id)
    }
  }
  for (const bank of composition.soundBanks) ids.add(bank.id)
  return ids
}

/**
 * Allocates the first `prefix-N` id that is free anywhere in the Composition.
 * Reserved lets a caller allocate several ids before any of them is committed.
 */
export const nextCompositionId = (
  composition: Composition,
  prefix: string,
  reserved: ReadonlySet<string> = new Set(),
) => {
  const taken = allCompositionIds(composition)
  for (let index = 1; ; index += 1) {
    const candidate = `${prefix}-${index}`
    if (!taken.has(candidate) && !reserved.has(candidate)) return candidate
  }
}

/**
 * The next name in a series, rather than a suffix on the name it came from.
 *
 * Adding copies the last object of its kind, so the new name was derived from
 * an already-derived name: "Wheel 1" begat "Wheel 1 2", which begat
 * "Wheel 1 2 2". Four Heads into a fourth Wheel the tree read
 * "Head 1 2 2 2 2 2 2 2 2". Numbering the *stem* — the name with its trailing
 * numbers removed — makes the series what a person would write by hand:
 * Wheel 1, Wheel 2, Wheel 3.
 *
 * A name that does not end in a number is not a series, so it keeps its whole
 * self and only gets a number when it collides: "Bass" then "Bass 2", and a
 * duplicate of "Wheel 1" is "Wheel 1 copy" then "Wheel 1 copy 2".
 *
 * Names are labels, not identity — an `id` is what every reference resolves
 * against, and nothing forbids two objects sharing a name. But the accessible
 * names the UI builds are composed from them ("Remove Grid Field", "Mute
 * Boundary Melody"), so duplicates leave a screen reader, and anything driving
 * the app through one, unable to tell two controls apart. Every path that
 * mints a name goes through here for that reason.
 */
export const uniqueName = (existing: ReadonlyArray<string>, base: string) => {
  const taken = new Set(existing)
  const series = /^(.*?)(?:\s+\d+)+$/.exec(base)
  const stem = series ? series[1] : base

  // An unnumbered name is only a series once something collides with it.
  if (!series && !taken.has(stem)) return stem

  // A bare stem already holds first place: "Bass" then "Bass 2", never a
  // "Bass 1" that sorts behind the Wheel it was added after.
  for (let index = taken.has(stem) ? 2 : 1; ; index += 1) {
    const candidate = `${stem} ${index}`
    if (!taken.has(candidate)) return candidate
  }
}

const moveWithin = <T>(items: ReadonlyArray<T>, from: number, to: number) => {
  if (from === to) return [...items]
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const clampIndex = (index: number, length: number) =>
  Math.min(Math.max(index, 0), Math.max(0, length - 1))

export const findWheelIndex = (composition: Composition, wheelId: string) =>
  composition.wheels.findIndex((wheel) => wheel.id === wheelId)

export const findHeadLocation = (composition: Composition, headId: string) => {
  for (
    let wheelIndex = 0;
    wheelIndex < composition.wheels.length;
    wheelIndex += 1
  ) {
    const headIndex = composition.wheels[wheelIndex].heads.findIndex(
      (head) => head.id === headId,
    )
    if (headIndex >= 0) return { wheelIndex, headIndex }
  }
  return null
}

// ---------------------------------------------------------------------------
// Reference integrity
// ---------------------------------------------------------------------------

/**
 * Every place the Composition points at `id`. Parts address Wheels and Heads
 * through their EncounterQuery, so a removal has to account for queries that
 * would silently widen from "this Head" to "any Head" if the id were dropped.
 */
export const referencesToId = (
  composition: Composition,
  id: string,
): ReadonlyArray<CompositionReference> => {
  const references: Array<CompositionReference> = []

  composition.parts.forEach((part, partIndex) => {
    const query = part.encounterQuery
    const lists: Array<[keyof typeof query, string]> = [
      ['wheelIds', 'Wheel'],
      ['headIds', 'Head'],
      ['fieldIds', 'Field'],
      ['boundaryIds', 'Boundary'],
    ]
    for (const [key, label] of lists) {
      const values = query[key] as ReadonlyArray<string>
      if (!values.includes(id)) continue
      references.push({
        path: `$.parts[${partIndex}].encounterQuery.${key}`,
        description:
          values.length === 1
            ? `Part "${part.name}" listens only to this ${label}; its filter would widen to every ${label}.`
            : `Part "${part.name}" filters on this ${label}.`,
      })
    }
    if (part.instrumentId === id) {
      references.push({
        path: `$.parts[${partIndex}].instrumentId`,
        description: `Part "${part.name}" plays through this Instrument.`,
      })
    }
  })

  composition.instruments.forEach((instrument, index) => {
    if (instrument.kind === 'soundfont' && instrument.soundBankId === id) {
      references.push({
        path: `$.instruments[${index}].soundBankId`,
        description: `Instrument "${instrument.name}" loads this sound bank.`,
      })
    }
  })

  return freeze(references)
}

const headRemovalImpact = (
  composition: Composition,
  head: HeadSpec,
  wheelIndex: number,
): RemovalImpact => {
  const wheel = composition.wheels[wheelIndex]
  const blockers =
    wheel.heads.length <= 1
      ? [
          `Wheel "${wheel.name}" must keep at least one Head. Remove the Wheel instead.`,
        ]
      : []

  return Object.freeze({
    kind: 'head' as const,
    id: head.id,
    name: head.name,
    cascadeRemovals: freeze([]),
    referenceRewrites: referencesToId(composition, head.id),
    blockers: freeze(blockers),
  })
}

const wheelRemovalImpact = (
  composition: Composition,
  wheel: WheelSpec,
): RemovalImpact => {
  const cascade: Array<CompositionReference> = wheel.heads.map((head) => ({
    path: `$.wheels[${findWheelIndex(composition, wheel.id)}].heads`,
    description: `Head "${head.name}" is removed with its Wheel.`,
  }))
  const rewrites = [
    ...referencesToId(composition, wheel.id),
    ...wheel.heads.flatMap((head) => referencesToId(composition, head.id)),
  ].sort((left, right) => compareText(left.path, right.path))
  const blockers =
    composition.wheels.length <= 1
      ? ['A Composition must keep at least one Wheel.']
      : []

  return Object.freeze({
    kind: 'wheel' as const,
    id: wheel.id,
    name: wheel.name,
    cascadeRemovals: freeze(cascade),
    referenceRewrites: freeze(rewrites),
    blockers: freeze(blockers),
  })
}

const partRemovalImpact = (part: PartSpec): RemovalImpact =>
  Object.freeze({
    kind: 'part' as const,
    id: part.id,
    name: part.name,
    cascadeRemovals: freeze([]),
    referenceRewrites: freeze([]),
    blockers: freeze([]),
  })

const instrumentRemovalImpact = (
  composition: Composition,
  id: string,
): RemovalImpact => {
  const instrument = composition.instruments.find(
    (candidate) => candidate.id === id,
  )
  if (!instrument) {
    throw new RangeError(`Unknown Instrument "${id}".`)
  }
  /*
   * Only note Parts block. Every Part carries an `instrumentId` because the
   * field lives on PartBase, but a Control Part drives a lane and never emits
   * a note — `compilePerformance` branches it away before pitch is mapped — so
   * its reference is bookkeeping, not sound. Counting it here refused a
   * removal on the grounds that a Part "plays through" an Instrument it does
   * not play through.
   *
   * It cannot simply be ignored either: the validator requires every Part's
   * instrumentId to name a real Instrument, so a Control Part left pointing at
   * a removed one would produce an invalid Composition. It is repointed
   * instead, and reported as a rewrite so the removal is confirmed rather than
   * done behind the user's back.
   */
  const players = composition.parts.filter(
    (part) => part.kind === 'note' && part.instrumentId === id,
  )
  const repointed = composition.parts.filter(
    (part) => part.kind !== 'note' && part.instrumentId === id,
  )
  const blockers: Array<string> = []
  if (composition.instruments.length <= 1) {
    blockers.push('A Composition must keep at least one Instrument.')
  }
  if (players.length > 0) {
    blockers.push(
      `${players.length} Part${players.length === 1 ? '' : 's'} still ${
        players.length === 1 ? 'plays' : 'play'
      } through "${instrument.name}": ${players
        .map((part) => `"${part.name}"`)
        .join(', ')}. Reassign them first.`,
    )
  }

  const survivor = composition.instruments.find(
    (candidate) => candidate.id !== id,
  )

  return Object.freeze({
    kind: 'instrument' as const,
    id,
    name: instrument.name,
    referenceRewrites: freeze(
      repointed.map((part) => ({
        path: `$.parts[${composition.parts.indexOf(part)}].instrumentId`,
        description: `Control Part "${part.name}" would be repointed to "${
          survivor?.name ?? 'another Instrument'
        }". It drives a lane rather than notes, so this does not change what you hear.`,
      })),
    ),
    cascadeRemovals: freeze([]),
    blockers: freeze(blockers),
  })
}

/**
 * Describes exactly what removing an object would do, before anything mutates.
 * Callers must show this to the user and pass `cascade: true` to accept it.
 */
export const removalImpact = (
  composition: Composition,
  kind: CompositionObjectKind,
  id: string,
): RemovalImpact => {
  if (kind === 'wheel') {
    const wheel = composition.wheels.find((candidate) => candidate.id === id)
    if (!wheel) throw new RangeError(`Unknown Wheel "${id}".`)
    return wheelRemovalImpact(composition, wheel)
  }
  if (kind === 'head') {
    const location = findHeadLocation(composition, id)
    if (!location) throw new RangeError(`Unknown Head "${id}".`)
    const head = composition.wheels[location.wheelIndex].heads[location.headIndex]
    return headRemovalImpact(composition, head, location.wheelIndex)
  }
  if (kind === 'part') {
    const part = composition.parts.find((candidate) => candidate.id === id)
    if (!part) throw new RangeError(`Unknown Part "${id}".`)
    return partRemovalImpact(part)
  }
  return instrumentRemovalImpact(composition, id)
}

export const removalIsBlocked = (impact: RemovalImpact) =>
  impact.blockers.length > 0

export const removalNeedsConfirmation = (impact: RemovalImpact) =>
  impact.cascadeRemovals.length > 0 || impact.referenceRewrites.length > 0

/** Drops every reference to `ids` from Part queries, leaving Parts intact. */
const pruneReferences = (
  parts: ReadonlyArray<PartSpec>,
  ids: ReadonlySet<string>,
): Array<PartSpec> =>
  parts.map((part) => {
    const query = part.encounterQuery
    const next = {
      ...query,
      wheelIds: query.wheelIds.filter((value) => !ids.has(value)),
      headIds: query.headIds.filter((value) => !ids.has(value)),
      fieldIds: query.fieldIds.filter((value) => !ids.has(value)),
      boundaryIds: query.boundaryIds.filter((value) => !ids.has(value)),
    }
    const unchanged =
      next.wheelIds.length === query.wheelIds.length &&
      next.headIds.length === query.headIds.length &&
      next.fieldIds.length === query.fieldIds.length &&
      next.boundaryIds.length === query.boundaryIds.length

    return unchanged ? part : ({ ...part, encounterQuery: next } as PartSpec)
  })

// ---------------------------------------------------------------------------
// Wheel operations
// ---------------------------------------------------------------------------

/**
 * Adds a Wheel modelled on `template`, carrying one Head.
 *
 * The template says what kind of Wheel to make — its motion, its rate — not
 * how much of it to bring along. Cloning every Head compounded: the tree adds
 * from the last Wheel, so four Heads added to a Wheel meant the next Wheel
 * arrived with five, then nine, then thirteen. `duplicateWheel` is the
 * operation that means "all of it", and it is a separate button.
 */
export const addWheel = (
  composition: Composition,
  template: WheelSpec,
): { composition: Composition; wheelId: string } => {
  const wheelId = nextCompositionId(composition, 'wheel')
  const reserved = new Set([wheelId])
  const heads = template.heads.slice(0, 1).map((head) => {
    const headId = nextCompositionId(composition, 'head', reserved)
    reserved.add(headId)
    return { ...structuredClone(head), id: headId }
  })
  const wheel: WheelSpec = {
    ...structuredClone(template),
    id: wheelId,
    name: uniqueName(
      composition.wheels.map((item) => item.name),
      template.name,
    ),
    heads,
  }

  return {
    composition: { ...composition, wheels: [...composition.wheels, wheel] },
    wheelId,
  }
}

export const duplicateWheel = (
  composition: Composition,
  wheelId: string,
): { composition: Composition; wheelId: string } => {
  const index = findWheelIndex(composition, wheelId)
  if (index < 0) throw new RangeError(`Unknown Wheel "${wheelId}".`)

  const source = composition.wheels[index]
  const newWheelId = nextCompositionId(composition, 'wheel')
  const reserved = new Set([newWheelId])
  const heads = source.heads.map((head) => {
    const headId = nextCompositionId(composition, 'head', reserved)
    reserved.add(headId)
    return { ...structuredClone(head), id: headId }
  })
  const copy: WheelSpec = {
    ...structuredClone(source),
    id: newWheelId,
    name: uniqueName(
      composition.wheels.map((item) => item.name),
      `${source.name} copy`,
    ),
    heads,
  }
  const wheels = [...composition.wheels]
  wheels.splice(index + 1, 0, copy)

  return { composition: { ...composition, wheels }, wheelId: newWheelId }
}

export const removeWheel = (
  composition: Composition,
  wheelId: string,
  options: { cascade?: boolean } = {},
): Composition => {
  const impact = removalImpact(composition, 'wheel', wheelId)
  if (removalIsBlocked(impact)) {
    throw new RangeError(impact.blockers.join(' '))
  }
  if (removalNeedsConfirmation(impact) && !options.cascade) {
    throw new RangeError(
      `Removing Wheel "${impact.name}" affects ${
        impact.cascadeRemovals.length + impact.referenceRewrites.length
      } other objects. Pass cascade: true to accept the impact.`,
    )
  }

  const wheel = composition.wheels.find((candidate) => candidate.id === wheelId)
  if (!wheel) throw new RangeError(`Unknown Wheel "${wheelId}".`)
  const removedIds = new Set<string>([
    wheelId,
    ...wheel.heads.map((head) => head.id),
  ])

  return {
    ...composition,
    wheels: composition.wheels.filter((candidate) => candidate.id !== wheelId),
    parts: pruneReferences(composition.parts, removedIds),
  }
}

export const moveWheel = (
  composition: Composition,
  wheelId: string,
  toIndex: number,
): Composition => {
  const from = findWheelIndex(composition, wheelId)
  if (from < 0) throw new RangeError(`Unknown Wheel "${wheelId}".`)

  return {
    ...composition,
    wheels: moveWithin(
      composition.wheels,
      from,
      clampIndex(toIndex, composition.wheels.length),
    ),
  }
}

export const setWheelEnabled = (
  composition: Composition,
  wheelId: string,
  enabled: boolean,
): Composition => ({
  ...composition,
  wheels: composition.wheels.map((wheel) =>
    wheel.id === wheelId ? { ...wheel, enabled } : wheel,
  ),
})

// ---------------------------------------------------------------------------
// Head operations
// ---------------------------------------------------------------------------

export const addHead = (
  composition: Composition,
  wheelId: string,
  template?: HeadSpec,
): { composition: Composition; headId: string } => {
  const index = findWheelIndex(composition, wheelId)
  if (index < 0) throw new RangeError(`Unknown Wheel "${wheelId}".`)

  const wheel = composition.wheels[index]
  const source = template ?? wheel.heads[wheel.heads.length - 1]
  if (!source) throw new RangeError(`Wheel "${wheelId}" has no Head to copy.`)

  const headId = nextCompositionId(composition, 'head')
  const head: HeadSpec = {
    ...structuredClone(source),
    id: headId,
    name: uniqueName(wheel.heads.map((item) => item.name), source.name),
    // A new Head must belong to its Wheel's motion family.
    attachment: structuredClone(
      template && template.attachment.kind === wheel.motion.kind
        ? template.attachment
        : wheel.heads[0].attachment,
    ),
  }
  const wheels = composition.wheels.map((candidate, candidateIndex) =>
    candidateIndex === index
      ? { ...candidate, heads: [...candidate.heads, head] }
      : candidate,
  )

  return { composition: { ...composition, wheels }, headId }
}

export const duplicateHead = (
  composition: Composition,
  headId: string,
): { composition: Composition; headId: string } => {
  const location = findHeadLocation(composition, headId)
  if (!location) throw new RangeError(`Unknown Head "${headId}".`)

  const wheel = composition.wheels[location.wheelIndex]
  const source = wheel.heads[location.headIndex]
  const newHeadId = nextCompositionId(composition, 'head')
  const copy: HeadSpec = {
    ...structuredClone(source),
    id: newHeadId,
    name: uniqueName(
      wheel.heads.map((item) => item.name),
      `${source.name} copy`,
    ),
  }
  const heads = [...wheel.heads]
  heads.splice(location.headIndex + 1, 0, copy)
  const wheels = composition.wheels.map((candidate, index) =>
    index === location.wheelIndex ? { ...candidate, heads } : candidate,
  )

  return { composition: { ...composition, wheels }, headId: newHeadId }
}

export const removeHead = (
  composition: Composition,
  headId: string,
  options: { cascade?: boolean } = {},
): Composition => {
  const impact = removalImpact(composition, 'head', headId)
  if (removalIsBlocked(impact)) {
    throw new RangeError(impact.blockers.join(' '))
  }
  if (removalNeedsConfirmation(impact) && !options.cascade) {
    throw new RangeError(
      `Removing Head "${impact.name}" affects ${impact.referenceRewrites.length} Part reference(s). Pass cascade: true to accept the impact.`,
    )
  }

  const location = findHeadLocation(composition, headId)
  if (!location) throw new RangeError(`Unknown Head "${headId}".`)

  const wheels = composition.wheels.map((wheel, index) =>
    index === location.wheelIndex
      ? { ...wheel, heads: wheel.heads.filter((head) => head.id !== headId) }
      : wheel,
  )

  return {
    ...composition,
    wheels,
    parts: pruneReferences(composition.parts, new Set([headId])),
  }
}

export const moveHead = (
  composition: Composition,
  headId: string,
  toIndex: number,
): Composition => {
  const location = findHeadLocation(composition, headId)
  if (!location) throw new RangeError(`Unknown Head "${headId}".`)

  const wheel = composition.wheels[location.wheelIndex]
  const heads = moveWithin(
    wheel.heads,
    location.headIndex,
    clampIndex(toIndex, wheel.heads.length),
  )

  return {
    ...composition,
    wheels: composition.wheels.map((candidate, index) =>
      index === location.wheelIndex ? { ...candidate, heads } : candidate,
    ),
  }
}

export const setHeadEnabled = (
  composition: Composition,
  headId: string,
  enabled: boolean,
): Composition => ({
  ...composition,
  wheels: composition.wheels.map((wheel) => ({
    ...wheel,
    heads: wheel.heads.map((head) =>
      head.id === headId ? { ...head, enabled } : head,
    ),
  })),
})

/** Visual-only hide/show. Never touches `enabled`, so geometry is unchanged. */
export const setHeadTraceVisible = (
  composition: Composition,
  headId: string,
  visible: boolean,
): Composition => ({
  ...composition,
  wheels: composition.wheels.map((wheel) => ({
    ...wheel,
    heads: wheel.heads.map((head) =>
      head.id === headId
        ? { ...head, trace: { ...head.trace, visible } }
        : head,
    ),
  })),
})

// ---------------------------------------------------------------------------
// Part performance state
// ---------------------------------------------------------------------------

/**
 * Copies a complete Part directly after its source.
 *
 * References to Wheels, Heads, Relations, Instruments, and tuning contexts are
 * settings and stay intact. The Part and any nested modulation mappings are
 * identities, so those receive fresh globally unique IDs.
 */
export const duplicatePart = (
  composition: Composition,
  partId: string,
): { composition: Composition; partId: string } => {
  const index = composition.parts.findIndex((part) => part.id === partId)
  if (index < 0) throw new RangeError(`Unknown Part "${partId}".`)

  const source = composition.parts[index]
  const newPartId = nextCompositionId(
    composition,
    source.kind === 'control' ? 'control' : 'part',
  )
  const reserved = new Set([newPartId])
  const copy = structuredClone(source)
  copy.id = newPartId
  copy.name = uniqueName(
    composition.parts.map((part) => part.name),
    `${source.name} copy`,
  )
  if (copy.kind === 'note' && copy.gateModulations) {
    copy.gateModulations = copy.gateModulations.map((mapping) => {
      const id = nextCompositionId(composition, 'gate-modulation', reserved)
      reserved.add(id)
      return { ...mapping, id }
    })
  }

  const parts = [...composition.parts]
  parts.splice(index + 1, 0, copy)
  return {
    composition: { ...composition, parts },
    partId: newPartId,
  }
}

export const setPartMuted = (
  composition: Composition,
  partId: string,
  mute: boolean,
): Composition => ({
  ...composition,
  parts: composition.parts.map((part) =>
    part.id === partId ? ({ ...part, mute } as PartSpec) : part,
  ),
})

export const setPartSolo = (
  composition: Composition,
  partId: string,
  solo: boolean,
): Composition => ({
  ...composition,
  parts: composition.parts.map((part) =>
    part.id === partId ? ({ ...part, solo } as PartSpec) : part,
  ),
})

export const setPartEnabled = (
  composition: Composition,
  partId: string,
  enabled: boolean,
): Composition => ({
  ...composition,
  parts: composition.parts.map((part) =>
    part.id === partId ? ({ ...part, enabled } as PartSpec) : part,
  ),
})

export const removePart = (
  composition: Composition,
  partId: string,
  options: { cascade?: boolean } = {},
): Composition => {
  const impact = removalImpact(composition, 'part', partId)
  if (removalIsBlocked(impact)) {
    throw new RangeError(impact.blockers.join(' '))
  }
  if (removalNeedsConfirmation(impact) && !options.cascade) {
    throw new RangeError(
      `Removing Part "${impact.name}" affects other objects. Pass cascade: true to accept the impact.`,
    )
  }

  return {
    ...composition,
    parts: composition.parts.filter((part) => part.id !== partId),
  }
}

/**
 * Adds an Instrument by copying one that already sounds.
 *
 * Copying rather than synthesising a default keeps this honest about the
 * union: a `soundfont` Instrument carries a bank reference and a preset, and
 * inventing those would produce an Instrument that validates and cannot play.
 * The template is whatever the caller was looking at, so the new voice starts
 * where the old one did and is edited from there.
 *
 * Nothing else in the Composition points at it yet. A new Instrument is silent
 * until a Part is aimed at it, which is the same order the rest of the chain
 * is built in.
 */
export const addInstrument = (
  composition: Composition,
  template: InstrumentSpec,
): { composition: Composition; instrumentId: string } => {
  const instrumentId = nextCompositionId(composition, 'instrument')
  const instrument: InstrumentSpec = {
    ...structuredClone(template),
    id: instrumentId,
    name: uniqueName(
      composition.instruments.map((item) => item.name),
      template.name,
    ),
  }

  return {
    composition: {
      ...composition,
      instruments: [...composition.instruments, instrument],
    },
    instrumentId,
  }
}

/**
 * Removes an Instrument.
 *
 * Neither blocker is overridable: a Composition must keep one Instrument, and
 * a note Part pointing at a removed Instrument would compile to nothing.
 * Reassigning those Parts first is the only way through, and the impact names
 * them.
 *
 * Control Parts are repointed rather than blocked. They carry an
 * `instrumentId` only because the field lives on PartBase and the validator
 * requires it to name a real Instrument — nothing reads it, because a Control
 * Part never emits a note. Leaving one dangling would fail validation, so it
 * is moved to a survivor, and `cascade` is required because a silent rewrite
 * of the user's data is not something to do unannounced.
 */
export const removeInstrument = (
  composition: Composition,
  instrumentId: string,
  options: { cascade?: boolean } = {},
): Composition => {
  const impact = removalImpact(composition, 'instrument', instrumentId)
  if (removalIsBlocked(impact)) {
    throw new RangeError(impact.blockers.join(' '))
  }
  if (removalNeedsConfirmation(impact) && !options.cascade) {
    throw new RangeError(
      `Removing Instrument "${impact.name}" repoints ${impact.referenceRewrites.length} Control Part(s). Pass cascade: true to accept the impact.`,
    )
  }

  const instruments = composition.instruments.filter(
    (instrument) => instrument.id !== instrumentId,
  )
  const survivorId = instruments[0].id

  return {
    ...composition,
    instruments,
    parts: composition.parts.map((part) =>
      part.instrumentId === instrumentId
        ? ({ ...part, instrumentId: survivorId } as PartSpec)
        : part,
    ),
  }
}
