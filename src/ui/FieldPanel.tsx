import type {
  BoundaryBase,
  Composition,
  FieldSpec,
  Point2,
} from '../core/composition'
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

export type FieldPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const TAU = Math.PI * 2

export function FieldPanel({ composition, onChange }: FieldPanelProps) {
  const commitFields = (fields: Array<FieldSpec>) =>
    onChange({ ...composition, fields })

  const createField = (kind: FieldSpec['kind']) => {
    const id = nextFieldId(composition.fields, kind)
    const boundaryId = nextBoundaryId(composition.fields, id)
    const base = {
      id,
      name: kind === 'rings' ? 'Ring Field' : 'Spoke Field',
      enabled: true,
      kind,
      center: { x: 0, y: 0 },
    } as const
    const field: FieldSpec =
      kind === 'rings'
        ? {
            ...base,
            kind: 'rings',
            boundaries: [
              {
                ...newBoundaryBase(boundaryId, 'Ring 1'),
                kind: 'ring',
                radius: 50,
              },
            ],
          }
        : {
            ...base,
            kind: 'spokes',
            rotation: 0,
            boundaries: [
              {
                ...newBoundaryBase(boundaryId, 'Spoke 1'),
                kind: 'spoke',
                angle: 0,
              },
            ],
          }

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
    const boundary =
      field.kind === 'rings'
        ? {
            ...newBoundaryBase(id, `Ring ${field.boundaries.length + 1}`),
            kind: 'ring' as const,
            radius:
              Math.max(...field.boundaries.map((item) => item.radius), 0) + 20,
          }
        : {
            ...newBoundaryBase(id, `Spoke ${field.boundaries.length + 1}`),
            kind: 'spoke' as const,
            angle:
              field.boundaries.length === 0
                ? 0
                : field.boundaries.at(-1)!.angle + TAU / 8,
          }

    commitFields(addBoundary(composition.fields, field.id, boundary))
  }

  return (
    <section className="control-panel field-panel" aria-label="Fields">
      <div className="panel-header">
        <h2>Fields</h2>
        <div className="panel-actions">
          <button type="button" onClick={() => createField('rings')}>
            Add rings
          </button>
          <button type="button" onClick={() => createField('spokes')}>
            Add spokes
          </button>
        </div>
      </div>

      {composition.fields.length === 0 ? (
        <p>No Fields yet.</p>
      ) : (
        <ol className="voice-list">
          {composition.fields.map((field, fieldIndex) => (
            <li key={field.id} className="voice-row">
              <div className="voice-head">
                <label className="voice-enable">
                  <input
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
                label="Center X"
                ariaLabel={`Center X ${field.id}`}
                value={field.center.x}
                onChange={(x) => patchCenter(field, { x })}
              />
              <NumberField
                label="Center Y"
                ariaLabel={`Center Y ${field.id}`}
                value={field.center.y}
                onChange={(y) => patchCenter(field, { y })}
              />

              {field.kind === 'spokes' && (
                <NumberField
                  label="Rotation (rad)"
                  ariaLabel={`Rotation ${field.id}`}
                  value={field.rotation}
                  step={0.01}
                  onChange={(rotation) =>
                    patchField(field.id, (current) =>
                      current.kind === 'spokes'
                        ? { ...current, rotation }
                        : current,
                    )
                  }
                />
              )}

              <div className="panel-actions">
                <button
                  type="button"
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
                  aria-label={`Remove ${field.id}`}
                  onClick={() =>
                    commitFields(removeField(composition.fields, field.id))
                  }
                >
                  Remove Field
                </button>
                <button type="button" onClick={() => createBoundary(field)}>
                  Add Boundary
                </button>
              </div>

              <ol className="voice-list">
                {field.boundaries.map((boundary, boundaryIndex) => (
                  <li key={boundary.id} className="voice-row">
                    <div className="voice-head">
                      <label className="voice-enable">
                        <input
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

                    <NumberField
                      label={boundary.kind === 'ring' ? 'Radius' : 'Angle (rad)'}
                      ariaLabel={`Value ${boundary.id}`}
                      value={
                        boundary.kind === 'ring'
                          ? boundary.radius
                          : boundary.angle
                      }
                      min={boundary.kind === 'ring' ? 0.001 : undefined}
                      step={boundary.kind === 'ring' ? 1 : 0.01}
                      onChange={(value) =>
                        commitFields(
                          updateBoundary(
                            composition.fields,
                            field.id,
                            boundary.id,
                            (current) =>
                              current.kind === 'ring'
                                ? { ...current, radius: Math.max(0.001, value) }
                                : { ...current, angle: value },
                          ),
                        )
                      }
                    />

                    <div className="panel-actions">
                      <button
                        type="button"
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
                      >
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
    </section>
  )
}

const newBoundaryBase = (id: string, name: string): BoundaryBase => ({
  id,
  name,
  enabled: true,
  index: 0,
})

type NumberFieldProps = {
  label: string
  ariaLabel: string
  value: number
  min?: number
  step?: number
  onChange: (value: number) => void
}

function NumberField({
  label,
  ariaLabel,
  value,
  min,
  step = 1,
  onChange,
}: NumberFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
