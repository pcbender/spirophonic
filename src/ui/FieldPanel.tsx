import type {
  BoundaryBase,
  Composition,
  FieldSpec,
  Point2,
} from '../core/composition'
import type { BoundarySpec } from '../core/fields'
import {
  addBoundary,
  addField,
  nextBoundaryId,
  nextFieldId,
  removeBoundary,
  removeField,
  reorderBoundary,
  reorderField,
  updateBoundary,
  updateField,
} from '../core/fields'
import { uniqueName } from '../core/compositionEdits'
import { help } from './help'
import { RailPanel } from './RailPanel'

export type FieldPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const TAU = Math.PI * 2

const fieldKindLabels: Record<FieldSpec['kind'], string> = {
  rings: 'Ring Field',
  spokes: 'Spoke Field',
  ellipses: 'Ellipse Field',
  bands: 'Band Field',
  grid: 'Grid Field',
  spiral: 'Spiral Field',
}

const boundaryLabels: Record<FieldSpec['kind'], string> = {
  rings: 'Ring',
  spokes: 'Spoke',
  ellipses: 'Ellipse',
  bands: 'Band',
  grid: 'Line',
  spiral: 'Spiral',
}

const motionKinds: Array<NonNullable<FieldSpec['motion']>['kind']> = [
  'fixed',
  'rotating',
  'transport-rotating',
  'wheel-attached',
]

const defaultMotion = (
  kind: NonNullable<FieldSpec['motion']>['kind'],
  wheelId: string,
): NonNullable<FieldSpec['motion']> => {
  if (kind === 'rotating') return { kind, turnsPerSecond: 0.25 }
  if (kind === 'transport-rotating') {
    return { kind, rate: { cycles: 1, beats: 8 } }
  }
  if (kind === 'wheel-attached') {
    return { kind, wheelId, followRotation: true }
  }
  return { kind: 'fixed' }
}

/** A new Boundary that does not collide with its siblings. */
const GRID_STEP = 40

/**
 * The next line in a grid, placed so the grid stays square and centred.
 *
 * The old rule alternated axis and stepped `floor(count / 2) * 40`, which only
 * ever produced non-negative offsets: a "grid" grew away from its own centre
 * into one quadrant and never became symmetric without editing every offset by
 * hand. This fills the axis that has fewer lines, and mirrors an unpaired line
 * before stepping further out, so a grid built one boundary at a time is
 * centred at every count.
 *
 * `axis: 'x'` is the locus `x === offset` — a vertical line. That is the
 * convention `gridSignedDistance` uses, and it is why a one-line grid looked
 * like a vertical stroke.
 */
const nextGridLine = (
  siblings: ReadonlyArray<BoundarySpec>,
): { kind: 'grid'; axis: 'x' | 'y'; offset: number } => {
  const lines = siblings.filter(
    (item): item is Extract<BoundarySpec, { kind: 'grid' }> =>
      item.kind === 'grid',
  )
  const onAxis = (axis: 'x' | 'y') =>
    lines.filter((line) => line.axis === axis)
  // Fill the thinner axis, so a grid grows square rather than striped.
  const axis: 'x' | 'y' =
    onAxis('y').length < onAxis('x').length ? 'y' : 'x'
  const existing = onAxis(axis)
  const positives = existing.filter((line) => line.offset > 0).length
  const negatives = existing.filter((line) => line.offset < 0).length
  const widest = existing.reduce(
    (value, line) => Math.max(value, Math.abs(line.offset)),
    0,
  )

  return positives > negatives
    ? // Mirror the unpaired line rather than reaching further out.
      { kind: 'grid', axis, offset: -widest }
    : { kind: 'grid', axis, offset: widest + GRID_STEP }
}

/**
 * How many Boundaries a new Field of this kind starts with.
 *
 * One, except for a grid. Every other kind is a complete instance of itself at
 * one Boundary — one ring is a ring, one spiral is a spiral — but one grid
 * line is a line, and "Add grid" that drew a single stroke was reporting the
 * data model accurately and the user's intent not at all. Four lines is the
 * count the shipped Composition uses for rings and spokes.
 */
const startingBoundaryCount = (kind: FieldSpec['kind']) =>
  kind === 'grid' ? 4 : 1

const defaultBoundary = (
  kind: FieldSpec['kind'],
  id: string,
  ordinal: number,
  siblings: ReadonlyArray<BoundarySpec>,
): BoundarySpec => {
  const base = { ...newBoundaryBase(id, `${boundaryLabels[kind]} ${ordinal}`) }
  const outermost = siblings.reduce((widest, item) => {
    if (item.kind === 'ring' || item.kind === 'ellipse') {
      return Math.max(widest, item.radius)
    }
    if (item.kind === 'band') return Math.max(widest, item.outerRadius)
    return widest
  }, 0)

  // A fresh Field starts at a visible default; later Boundaries step outward
  // from the widest sibling so they never land on top of one another.
  if (kind === 'rings') {
    return {
      ...base,
      kind: 'ring',
      radius: siblings.length === 0 ? 50 : outermost + 20,
    }
  }
  if (kind === 'spokes') {
    const last = siblings.at(-1)
    return {
      ...base,
      kind: 'spoke',
      angle: last && last.kind === 'spoke' ? last.angle + TAU / 8 : 0,
      angularWidth: TAU / 24,
    }
  }
  if (kind === 'ellipses') {
    return {
      ...base,
      kind: 'ellipse',
      radius: siblings.length === 0 ? 80 : outermost + 30,
      eccentricity: 0.6,
    }
  }
  if (kind === 'bands') {
    const inner = siblings.length === 0 ? 40 : outermost + 20
    return {
      ...base,
      kind: 'band',
      innerRadius: inner,
      outerRadius: inner + 40,
    }
  }
  if (kind === 'grid') {
    return { ...base, ...nextGridLine(siblings) }
  }
  return {
    ...base,
    kind: 'spiral',
    startRadius: 30,
    growthPerTurn: 40,
    turns: 3,
  }
}

export function FieldPanel({ composition, onChange }: FieldPanelProps) {
  const commitFields = (fields: Array<FieldSpec>) =>
    onChange({ ...composition, fields })

  const createField = (kind: FieldSpec['kind']) => {
    const id = nextFieldId(composition.fields, kind)
    const base = {
      id,
      name: uniqueName(
        composition.fields.map((field) => field.name),
        fieldKindLabels[kind],
      ),
      enabled: true,
      center: { x: 0, y: 0 },
    }
    // Seeded through the same rule that adds one later, so a grid built by
    // pressing the button and a grid built one Boundary at a time agree.
    const boundaries: Array<BoundarySpec> = []
    for (let ordinal = 1; ordinal <= startingBoundaryCount(kind); ordinal += 1) {
      boundaries.push({
        ...defaultBoundary(kind, `${id}-boundary-${ordinal}`, ordinal, boundaries),
        // newBoundaryBase hard-codes index 0, which was invisible while a Field
        // could only start with one Boundary. Duplicate indices are a
        // validation error, and addBoundary reindexes for the same reason.
        index: ordinal - 1,
      })
    }
    const field = {
      ...base,
      kind,
      // Rings and bands are rotationally symmetric, so they stay rotation-free.
      ...(kind === 'rings' || kind === 'bands' ? {} : { rotation: 0 }),
      boundaries,
    } as FieldSpec

    commitFields(addField(composition.fields, field))
  }

  const patchField = (
    fieldId: string,
    patch: (field: FieldSpec) => FieldSpec,
  ) => commitFields(updateField(composition.fields, fieldId, patch))

  const patchCenter = (field: FieldSpec, patch: Partial<Point2>) =>
    patchField(field.id, (current) => ({
      ...current,
      center: { ...current.center, ...patch },
    }))

  const createBoundary = (field: FieldSpec) => {
    const id = nextBoundaryId(composition.fields, field.id)
    const boundary = defaultBoundary(
      field.kind,
      id,
      field.boundaries.length + 1,
      field.boundaries,
    )
    // Counting the siblings names the third Boundary of a Field that has had
    // one removed after the second: the Boundary picker in the Parts panel
    // lists them as "Field / Boundary", and two rows reading the same thing
    // pick the same one.
    const named = {
      ...boundary,
      name: uniqueName(
        field.boundaries.map((item) => item.name),
        boundary.name,
      ),
    } as BoundarySpec

    commitFields(addBoundary(composition.fields, field.id, named))
  }

  return (
    <RailPanel
      label="Fields"
      title="Fields"
      className="field-panel"
      actions={
        <div className="panel-actions">
          <button type="button" title={help['field.add']} onClick={() => createField('rings')}>
            Add rings
          </button>
          <button type="button" title={help['field.add']} onClick={() => createField('spokes')}>
            Add spokes
          </button>
          <button type="button" title={help['field.add']} onClick={() => createField('ellipses')}>
            Add ellipses
          </button>
          <button type="button" title={help['field.add']} onClick={() => createField('bands')}>
            Add bands
          </button>
          <button type="button" title={help['field.add']} onClick={() => createField('grid')}>
            Add grid
          </button>
          <button type="button" title={help['field.add']} onClick={() => createField('spiral')}>
            Add spiral
          </button>
        </div>
      }
    >
      {composition.fields.length === 0 ? (
        <p>No Fields yet.</p>
      ) : (
        <ol className="voice-list">
          {composition.fields.map((field, fieldIndex) => (
            <li key={field.id} className="voice-row">
              <div className="voice-head">
                <label className="voice-enable">
                  <input
                  title={help['field.enabled']}
                  aria-label={`Enable ${field.id}`}
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(event) =>
                      patchField(field.id, (current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                  <span>{field.name}</span>
                </label>
                <code>{field.id}</code>
              </div>

              <label>
                <span>Name</span>
                <input
                  title={help['field.name']}
                  aria-label={`Name ${field.id}`}
                  value={field.name}
                  onChange={(event) =>
                    patchField(field.id, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <NumberField
                label="Center X" hint={help['field.centerX']}
                ariaLabel={`Center X ${field.id}`}
                value={field.center.x}
                onChange={(x) => patchCenter(field, { x })}
              />
              <NumberField
                label="Center Y" hint={help['field.centerY']}
                ariaLabel={`Center Y ${field.id}`}
                value={field.center.y}
                onChange={(y) => patchCenter(field, { y })}
              />

              {field.kind !== 'rings' && field.kind !== 'bands' && (
                <NumberField
                  label="Rotation (rad)" hint={help['field.rotation']}
                  ariaLabel={`Rotation ${field.id}`}
                  value={field.rotation ?? 0}
                  step={0.01}
                  onChange={(rotation) =>
                    patchField(field.id, (current) =>
                      ({ ...current, rotation }) as FieldSpec,
                    )
                  }
                />
              )}

              <label className="field" title={help['field.motion']}>
                <span>Motion</span>
                <select
                  aria-label={`Motion ${field.id}`}
                  value={(field.motion ?? { kind: 'fixed' }).kind}
                  onChange={(event) =>
                    patchField(field.id, (current) =>
                      ({
                        ...current,
                        motion: defaultMotion(
                          event.currentTarget
                            .value as NonNullable<FieldSpec['motion']>['kind'],
                          composition.wheels[0]?.id ?? '',
                        ),
                      }) as FieldSpec,
                    )
                  }
                >
                  {motionKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>

              {field.motion?.kind === 'rotating' && (
                <NumberField
                  label="Turns per second" hint={help['field.turnsPerSecond']}
                  ariaLabel={`Turns per second ${field.id}`}
                  value={field.motion.turnsPerSecond}
                  step={0.05}
                  onChange={(turnsPerSecond) =>
                    patchField(field.id, (current) =>
                      ({
                        ...current,
                        motion: { kind: 'rotating', turnsPerSecond },
                      }) as FieldSpec,
                    )
                  }
                />
              )}

              {field.motion?.kind === 'transport-rotating' && (
                <>
                  <NumberField
                    label="Turn cycles" hint={help['field.turnCycles']}
                    ariaLabel={`Turn cycles ${field.id}`}
                    value={field.motion.rate.cycles}
                    min={0.01}
                    step={0.25}
                    onChange={(cycles) =>
                      patchField(field.id, (current) =>
                        current.motion?.kind === 'transport-rotating'
                          ? ({
                              ...current,
                              motion: {
                                ...current.motion,
                                rate: { ...current.motion.rate, cycles },
                              },
                            } as FieldSpec)
                          : current,
                      )
                    }
                  />
                  <NumberField
                    label="Turn beats" hint={help['field.turnBeats']}
                    ariaLabel={`Turn beats ${field.id}`}
                    value={field.motion.rate.beats}
                    min={0.01}
                    step={0.25}
                    onChange={(beats) =>
                      patchField(field.id, (current) =>
                        current.motion?.kind === 'transport-rotating'
                          ? ({
                              ...current,
                              motion: {
                                ...current.motion,
                                rate: { ...current.motion.rate, beats },
                              },
                            } as FieldSpec)
                          : current,
                      )
                    }
                  />
                </>
              )}

              {field.motion?.kind === 'wheel-attached' && (
                <>
                  <label className="field" title={help['field.attachedWheel']}>
                    <span>Attached Wheel</span>
                    <select
                      aria-label={`Attached Wheel ${field.id}`}
                      value={field.motion.wheelId}
                      onChange={(event) =>
                        patchField(field.id, (current) =>
                          current.motion?.kind === 'wheel-attached'
                            ? ({
                                ...current,
                                motion: {
                                  ...current.motion,
                                  wheelId: event.currentTarget.value,
                                },
                              } as FieldSpec)
                            : current,
                        )
                      }
                    >
                      {composition.wheels.map((wheel) => (
                        <option key={wheel.id} value={wheel.id}>
                          {wheel.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" title={help['field.followRotation']}>
                    <span>Follow rotation</span>
                    <input
                      type="checkbox"
                      aria-label={`Follow rotation ${field.id}`}
                      checked={field.motion.followRotation}
                      onChange={(event) =>
                        patchField(field.id, (current) =>
                          current.motion?.kind === 'wheel-attached'
                            ? ({
                                ...current,
                                motion: {
                                  ...current.motion,
                                  followRotation: event.currentTarget.checked,
                                },
                              } as FieldSpec)
                            : current,
                        )
                      }
                    />
                  </label>
                </>
              )}

              <div className="panel-actions">
                <button
                  type="button"
                  title={help['field.moveField']}
                  aria-label={`Move ${field.id} up`}
                  disabled={fieldIndex === 0}
                  onClick={() =>
                    commitFields(
                      reorderField(composition.fields, field.id, fieldIndex - 1),
                    )
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  title={help['field.moveField']}
                  aria-label={`Move ${field.id} down`}
                  disabled={fieldIndex === composition.fields.length - 1}
                  onClick={() =>
                    commitFields(
                      reorderField(composition.fields, field.id, fieldIndex + 1),
                    )
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  title={help['field.removeField']}
                  aria-label={`Remove ${field.id}`}
                  onClick={() =>
                    commitFields(removeField(composition.fields, field.id))
                  }
                >
                  Remove Field
                </button>
                <button
                  type="button"
                  title={help['field.addBoundary']}
                  aria-label={`Add boundary ${field.id}`}
                  onClick={() => createBoundary(field)}
                >
                  Add Boundary
                </button>
              </div>

              <ol className="voice-list">
                {field.boundaries.map((boundary, boundaryIndex) => (
                  <li key={boundary.id} className="voice-row">
                    <div className="voice-head">
                      <label className="voice-enable">
                        <input
                  title={help['boundary.enabled']}
                  aria-label={`Enable ${boundary.id}`}
                          type="checkbox"
                          checked={boundary.enabled}
                          onChange={(event) =>
                            commitFields(
                              updateBoundary(
                                composition.fields,
                                field.id,
                                boundary.id,
                                (current) => ({
                                  ...current,
                                  enabled: event.target.checked,
                                }),
                              ),
                            )
                          }
                        />
                        <span>{boundary.name}</span>
                      </label>
                      <code>{boundary.id}</code>
                    </div>

                    <label>
                      <span>Name</span>
                      <input
                  title={help['boundary.name']}
                  aria-label={`Name ${boundary.id}`}
                        value={boundary.name}
                        onChange={(event) =>
                          commitFields(
                            updateBoundary(
                              composition.fields,
                              field.id,
                              boundary.id,
                              (current) => ({
                                ...current,
                                name: event.target.value,
                              }),
                            ),
                          )
                        }
                      />
                    </label>

                    <BoundaryFields
                      boundary={boundary}
                      onPatch={(patch) =>
                        commitFields(
                          updateBoundary(
                            composition.fields,
                            field.id,
                            boundary.id,
                            (current) =>
                              ({ ...current, ...patch }) as BoundarySpec,
                          ),
                        )
                      }
                    />

                    <div className="panel-actions">
                      <button
                        type="button"
                  title={help['boundary.move']}
                  aria-label={`Move ${boundary.id} up`}
                        disabled={boundaryIndex === 0}
                        onClick={() =>
                          commitFields(
                            reorderBoundary(
                              composition.fields,
                              field.id,
                              boundary.id,
                              boundaryIndex - 1,
                            ),
                          )
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                  title={help['boundary.move']}
                  aria-label={`Move ${boundary.id} down`}
                        disabled={boundaryIndex === field.boundaries.length - 1}
                        onClick={() =>
                          commitFields(
                            reorderBoundary(
                              composition.fields,
                              field.id,
                              boundary.id,
                              boundaryIndex + 1,
                            ),
                          )
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${boundary.id}`}
                        disabled={field.boundaries.length === 1}
                        onClick={() =>
                          commitFields(
                            removeBoundary(
                              composition.fields,
                              field.id,
                              boundary.id,
                            ),
                          )
                        }
                       title={help['boundary.remove']}>
                        Remove Boundary
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </RailPanel>
  )
}

const newBoundaryBase = (id: string, name: string): BoundaryBase => ({
  id,
  name,
  enabled: true,
  index: 0,
})

type BoundaryFieldsProps = {
  boundary: BoundarySpec
  onPatch: (patch: Record<string, unknown>) => void
}

/** Numeric controls for whichever Boundary family is selected. */
function BoundaryFields({ boundary, onPatch }: BoundaryFieldsProps) {
  if (boundary.kind === 'ring' || boundary.kind === 'ellipse') {
    return (
      <>
        <NumberField
          label="Radius" hint={help['boundary.radius']}
          ariaLabel={`Radius ${boundary.id}`}
          value={boundary.radius}
          min={0.001}
          step={1}
          onChange={(value) => onPatch({ radius: Math.max(0.001, value) })}
        />
        {boundary.kind === 'ellipse' && (
          <NumberField
            label="Eccentricity" hint={help['boundary.eccentricity']}
            ariaLabel={`Eccentricity ${boundary.id}`}
            value={boundary.eccentricity}
            min={0}
            step={0.05}
            onChange={(value) =>
              // 1 collapses the ellipse, so the control stops just short of it.
              onPatch({ eccentricity: Math.min(0.99, Math.max(0, value)) })
            }
          />
        )}
      </>
    )
  }

  if (boundary.kind === 'spoke') {
    return (
      <>
        <NumberField
          label="Angle (rad)" hint={help['boundary.angle']}
          ariaLabel={`Angle ${boundary.id}`}
          value={boundary.angle}
          step={0.01}
          onChange={(value) => onPatch({ angle: value })}
        />
        <NumberField
          label="Width (rad)" hint={help['boundary.angularWidth']}
          ariaLabel={`Angular width ${boundary.id}`}
          value={boundary.angularWidth ?? 0}
          min={0}
          max={Math.PI}
          step={0.01}
          onChange={(angularWidth) =>
            onPatch({ angularWidth: Math.min(Math.PI, Math.max(0, angularWidth)) })
          }
        />
      </>
    )
  }

  if (boundary.kind === 'band') {
    return (
      <>
        <NumberField
          label="Inner radius" hint={help['boundary.innerRadius']}
          ariaLabel={`Inner radius ${boundary.id}`}
          value={boundary.innerRadius}
          min={0}
          step={1}
          onChange={(value) =>
            onPatch({
              innerRadius: Math.max(0, Math.min(value, boundary.outerRadius - 0.001)),
            })
          }
        />
        <NumberField
          label="Outer radius" hint={help['boundary.outerRadius']}
          ariaLabel={`Outer radius ${boundary.id}`}
          value={boundary.outerRadius}
          min={0.001}
          step={1}
          onChange={(value) =>
            onPatch({
              outerRadius: Math.max(boundary.innerRadius + 0.001, value),
            })
          }
        />
      </>
    )
  }

  if (boundary.kind === 'grid') {
    return (
      <>
        <label className="field" title={help['boundary.axis']}>
          <span>Axis</span>
          <select
            aria-label={`Axis ${boundary.id}`}
            value={boundary.axis}
            onChange={(event) => onPatch({ axis: event.currentTarget.value })}
          >
            <option value="x">X</option>
            <option value="y">Y</option>
          </select>
        </label>
        <NumberField
          label="Offset" hint={help['boundary.offset']}
          ariaLabel={`Offset ${boundary.id}`}
          value={boundary.offset}
          step={1}
          onChange={(value) => onPatch({ offset: value })}
        />
      </>
    )
  }

  return (
    <>
      <NumberField
        label="Start radius" hint={help['boundary.startRadius']}
        ariaLabel={`Start radius ${boundary.id}`}
        value={boundary.startRadius}
        min={0}
        step={1}
        onChange={(value) => onPatch({ startRadius: Math.max(0, value) })}
      />
      <NumberField
        label="Growth per turn" hint={help['boundary.growthPerTurn']}
        ariaLabel={`Growth ${boundary.id}`}
        value={boundary.growthPerTurn}
        min={0.001}
        step={1}
        onChange={(value) => onPatch({ growthPerTurn: Math.max(0.001, value) })}
      />
      <NumberField
        label="Turns" hint={help['boundary.turns']}
        ariaLabel={`Turns ${boundary.id}`}
        value={boundary.turns}
        min={1}
        step={1}
        onChange={(value) =>
          onPatch({ turns: Math.max(1, Math.round(value)) })
        }
      />
    </>
  )
}

type NumberFieldProps = {
  label: string
  ariaLabel: string
  value: number
  min?: number
  max?: number
  step?: number
  /** Hover help. See `./help`. */
  hint?: string
  onChange: (value: number) => void
}

function NumberField({
  label,
  ariaLabel,
  value,
  min,
  max,
  step = 1,
  hint,
  onChange,
}: NumberFieldProps) {
  return (
    <label title={hint}>
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
