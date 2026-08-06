import { useState } from 'react'

import type { Composition } from '../core/composition'
import {
  addHead,
  addWheel,
  duplicateHead,
  duplicateWheel,
  moveHead,
  moveWheel,
  removalImpact,
  removeHead,
  removePart,
  removeWheel,
  setHeadEnabled,
  setHeadTraceVisible,
  setPartEnabled,
  setPartMuted,
  setPartSolo,
  setWheelEnabled,
  type RemovalImpact,
} from '../core/compositionEdits'
import { RailPanel } from './RailPanel'

export type TreeSelection =
  | { kind: 'wheel'; id: string }
  | { kind: 'head'; id: string }
  | { kind: 'part'; id: string }

export type CompositionTreeProps = {
  composition: Composition
  selection: TreeSelection
  onSelect: (selection: TreeSelection) => void
  onChange: (composition: Composition) => void
}

type PendingRemoval = {
  kind: 'wheel' | 'head' | 'part'
  impact: RemovalImpact
}

const isSelected = (selection: TreeSelection, kind: string, id: string) =>
  selection.kind === kind && selection.id === id

export function CompositionTree({
  composition,
  selection,
  onSelect,
  onChange,
}: CompositionTreeProps) {
  const [pending, setPending] = useState<PendingRemoval | null>(null)

  const requestRemoval = (kind: PendingRemoval['kind'], id: string) => {
    const impact = removalImpact(composition, kind, id)
    setPending({ kind, impact })
  }

  const confirmRemoval = () => {
    if (!pending) return
    const { kind, impact } = pending
    const next =
      kind === 'wheel'
        ? removeWheel(composition, impact.id, { cascade: true })
        : kind === 'head'
          ? removeHead(composition, impact.id, { cascade: true })
          : removePart(composition, impact.id, { cascade: true })

    // Selection must never dangle on a removed object.
    if (isSelected(selection, kind, impact.id)) {
      onSelect({ kind: 'wheel', id: next.wheels[0].id })
    }
    setPending(null)
    onChange(next)
  }

  const soloActive = composition.parts.some(
    (part) => part.enabled && part.solo,
  )

  return (
    <RailPanel
      label="Composition tree"
      // Distinct from the "Composition" panel above it, which holds the name
      // and the Transport. This one is the Wheel / Head / Part structure.
      title="Composition tree"
      className="composition-tree"
      actions={
        <button
          type="button"
          onClick={() => {
            const { composition: next, wheelId } = addWheel(
              composition,
              composition.wheels[composition.wheels.length - 1],
            )
            onSelect({ kind: 'wheel', id: wheelId })
            onChange(next)
          }}
        >
          Add Wheel
        </button>
      }
    >
      <ul className="tree-list">
        {composition.wheels.map((wheel, wheelIndex) => (
          <li key={wheel.id} className="tree-wheel">
            <div
              className={`tree-row${
                isSelected(selection, 'wheel', wheel.id) ? ' is-selected' : ''
              }${wheel.enabled ? '' : ' is-disabled'}`}
            >
              <button
                type="button"
                className="tree-label"
                aria-pressed={isSelected(selection, 'wheel', wheel.id)}
                onClick={() => onSelect({ kind: 'wheel', id: wheel.id })}
              >
                {wheel.name}
              </button>
              <span className="tree-actions">
                <label className="tree-toggle">
                  <input
                    type="checkbox"
                    aria-label={`${wheel.name} enabled`}
                    checked={wheel.enabled}
                    onChange={(event) =>
                      onChange(
                        setWheelEnabled(
                          composition,
                          wheel.id,
                          event.currentTarget.checked,
                        ),
                      )
                    }
                  />
                  <span>On</span>
                </label>
                <button
                  type="button"
                  aria-label={`Move ${wheel.name} up`}
                  disabled={wheelIndex === 0}
                  onClick={() =>
                    onChange(moveWheel(composition, wheel.id, wheelIndex - 1))
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${wheel.name} down`}
                  disabled={wheelIndex === composition.wheels.length - 1}
                  onClick={() =>
                    onChange(moveWheel(composition, wheel.id, wheelIndex + 1))
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Duplicate ${wheel.name}`}
                  onClick={() => {
                    const { composition: next, wheelId } = duplicateWheel(
                      composition,
                      wheel.id,
                    )
                    onSelect({ kind: 'wheel', id: wheelId })
                    onChange(next)
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  aria-label={`Add Head to ${wheel.name}`}
                  onClick={() => {
                    const { composition: next, headId } = addHead(
                      composition,
                      wheel.id,
                    )
                    onSelect({ kind: 'head', id: headId })
                    onChange(next)
                  }}
                >
                  +Head
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${wheel.name}`}
                  onClick={() => requestRemoval('wheel', wheel.id)}
                >
                  Remove
                </button>
              </span>
            </div>

            <ul className="tree-heads">
              {wheel.heads.map((head, headIndex) => (
                <li key={head.id}>
                  <div
                    className={`tree-row${
                      isSelected(selection, 'head', head.id)
                        ? ' is-selected'
                        : ''
                    }${head.enabled ? '' : ' is-disabled'}`}
                  >
                    <button
                      type="button"
                      className="tree-label"
                      aria-pressed={isSelected(selection, 'head', head.id)}
                      onClick={() => onSelect({ kind: 'head', id: head.id })}
                    >
                      {head.name}
                    </button>
                    <span className="tree-actions">
                      <label className="tree-toggle">
                        <input
                          type="checkbox"
                          aria-label={`${wheel.name} ${head.name} enabled`}
                          checked={head.enabled}
                          onChange={(event) =>
                            onChange(
                              setHeadEnabled(
                                composition,
                                head.id,
                                event.currentTarget.checked,
                              ),
                            )
                          }
                        />
                        <span>On</span>
                      </label>
                      <label className="tree-toggle">
                        <input
                          type="checkbox"
                          aria-label={`${wheel.name} ${head.name} trace visible`}
                          checked={head.trace.visible}
                          onChange={(event) =>
                            onChange(
                              setHeadTraceVisible(
                                composition,
                                head.id,
                                event.currentTarget.checked,
                              ),
                            )
                          }
                        />
                        <span>Show</span>
                      </label>
                      <button
                        type="button"
                        aria-label={`Move ${wheel.name} ${head.name} up`}
                        disabled={headIndex === 0}
                        onClick={() =>
                          onChange(moveHead(composition, head.id, headIndex - 1))
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${wheel.name} ${head.name} down`}
                        disabled={headIndex === wheel.heads.length - 1}
                        onClick={() =>
                          onChange(moveHead(composition, head.id, headIndex + 1))
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`Duplicate ${wheel.name} ${head.name}`}
                        onClick={() => {
                          const { composition: next, headId } = duplicateHead(
                            composition,
                            head.id,
                          )
                          onSelect({ kind: 'head', id: headId })
                          onChange(next)
                        }}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${wheel.name} ${head.name}`}
                        onClick={() => requestRemoval('head', head.id)}
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h3>Parts</h3>
      <ul className="tree-list tree-parts">
        {composition.parts.map((part) => {
          const instrument = composition.instruments.find(
            (candidate) => candidate.id === part.instrumentId,
          )
          const silent =
            !part.enabled || (soloActive ? !part.solo : part.mute)

          return (
            <li key={part.id}>
              <div
                className={`tree-row${
                  isSelected(selection, 'part', part.id) ? ' is-selected' : ''
                }${silent ? ' is-disabled' : ''}`}
              >
                <button
                  type="button"
                  className="tree-label"
                  aria-pressed={isSelected(selection, 'part', part.id)}
                  onClick={() => onSelect({ kind: 'part', id: part.id })}
                >
                  {part.name}
                  <small> → {instrument?.name ?? 'missing Instrument'}</small>
                </button>
                <span className="tree-actions">
                  <label className="tree-toggle">
                    <input
                      type="checkbox"
                      aria-label={`${part.name} enabled`}
                      checked={part.enabled}
                      onChange={(event) =>
                        onChange(
                          setPartEnabled(
                            composition,
                            part.id,
                            event.currentTarget.checked,
                          ),
                        )
                      }
                    />
                    <span>On</span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Mute ${part.name}`}
                    aria-pressed={part.mute}
                    className={part.mute ? 'is-active' : ''}
                    onClick={() =>
                      onChange(setPartMuted(composition, part.id, !part.mute))
                    }
                  >
                    M
                  </button>
                  <button
                    type="button"
                    aria-label={`Solo ${part.name}`}
                    aria-pressed={part.solo}
                    className={part.solo ? 'is-active' : ''}
                    onClick={() =>
                      onChange(setPartSolo(composition, part.id, !part.solo))
                    }
                  >
                    S
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${part.name}`}
                    onClick={() => requestRemoval('part', part.id)}
                  >
                    Remove
                  </button>
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {pending && (
        <div className="removal-impact" role="alertdialog" aria-label="Confirm removal">
          <h3>Remove {pending.impact.name}?</h3>
          {pending.impact.blockers.length > 0 ? (
            <>
              <p>This cannot be removed:</p>
              <ul>
                {pending.impact.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
              <button type="button" onClick={() => setPending(null)}>
                Close
              </button>
            </>
          ) : (
            <>
              {pending.impact.cascadeRemovals.length === 0 &&
              pending.impact.referenceRewrites.length === 0 ? (
                <p>Nothing else references it.</p>
              ) : (
                <>
                  <p>This also changes:</p>
                  <ul>
                    {pending.impact.cascadeRemovals.map((item) => (
                      <li key={item.path + item.description}>
                        {item.description}
                      </li>
                    ))}
                    {pending.impact.referenceRewrites.map((item) => (
                      <li key={item.path + item.description}>
                        {item.description}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button type="button" onClick={confirmRemoval}>
                Remove anyway
              </button>
              <button type="button" onClick={() => setPending(null)}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </RailPanel>
  )
}
