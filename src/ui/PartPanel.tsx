import type {
  Composition,
  ControlPartSpec,
  EncounterDirection,
  EncounterQuery,
  NotePartSpec,
  PartSpec,
  RelationSpec,
  ScaleName,
  WheelSpec,
} from '../core/composition'
import { scaleNames } from '../core/scales'
import { RailPanel } from './RailPanel'

export type PartPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const relationKinds: Array<RelationSpec['kind']> = [
  'conjunction',
  'closest-approach',
  'radial-alignment',
  'angular-alignment',
  'opposition',
  'direction-match',
]

const controlSources: Array<ControlPartSpec['control']['source']> = [
  'distance',
  'angle',
  'approach-rate',
  'rotation-rate',
  'strength',
]

const nextId = (composition: Composition, prefix: string) => {
  const taken = new Set([
    ...composition.parts.map((part) => part.id),
    ...(composition.relations ?? []).map((relation) => relation.id),
  ])
  let index = 1
  while (taken.has(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

const directions: Array<Extract<
  EncounterDirection,
  'inward' | 'outward' | 'clockwise' | 'counterclockwise'
>> = ['inward', 'outward', 'clockwise', 'counterclockwise']

/**
 * The Heads a Part could currently select, which is the Heads on the Wheels it
 * listens to. A Head on an unlisted Wheel can never match — an Encounter has
 * to satisfy both lists — so offering it would be offering a no-op.
 */
const headsInScope = (composition: Composition, query: EncounterQuery) =>
  composition.wheels
    .filter(
      (wheel) =>
        query.wheelIds.length === 0 || query.wheelIds.includes(wheel.id),
    )
    .flatMap((wheel) => wheel.heads.map((head) => ({ wheel, head })))

const toggled = (list: ReadonlyArray<string>, id: string) =>
  list.includes(id) ? list.filter((value) => value !== id) : [...list, id]

/**
 * Adds or removes a Wheel from a Part's filter.
 *
 * An empty list means *every* Wheel — that is the query language, not a null
 * state — so unchecking the last Wheel widens the Part rather than silencing
 * it. Head filters for a Wheel the Part no longer listens to are dropped with
 * it: an Encounter must satisfy both lists, so such a Head could never match
 * again and would only sit there as a dead reference.
 */
const withWheelToggled = (
  query: EncounterQuery,
  wheel: WheelSpec,
): EncounterQuery => {
  const wheelIds = toggled(query.wheelIds, wheel.id)
  const headIds = wheelIds.includes(wheel.id)
    ? query.headIds
    : query.headIds.filter(
        (id) => !wheel.heads.some((head) => head.id === id),
      )
  return { ...query, wheelIds, headIds }
}

export function PartPanel({ composition, onChange }: PartPanelProps) {
  const parts = composition.parts.filter(
    (part): part is NotePartSpec => part.kind === 'note',
  )
  const controlParts = composition.parts.filter(
    (part): part is ControlPartSpec => part.kind === 'control',
  )
  const relations = composition.relations ?? []

  const updateRelation = (
    id: string,
    next: (relation: RelationSpec) => RelationSpec,
  ) =>
    onChange({
      ...composition,
      relations: relations.map((relation) =>
        relation.id === id ? next(relation) : relation,
      ),
    })

  const updateControl = (
    id: string,
    next: (part: ControlPartSpec) => ControlPartSpec,
  ) =>
    onChange({
      ...composition,
      parts: composition.parts.map((part) =>
        part.id === id && part.kind === 'control' ? next(part) : part,
      ),
    })

  const addRelation = () => {
    const id = nextId(composition, 'relation')
    onChange({
      ...composition,
      relations: [
        ...relations,
        {
          id,
          name: `Relation ${relations.length + 1}`,
          enabled: true,
          kind: 'conjunction',
          headIds: [],
          threshold: 40,
          hysteresis: 10,
          minSeparationSeconds: 0.1,
        },
      ],
    })
  }

  const tuningContexts = composition.tuningContexts ?? []

  const addTuningContext = () => {
    const id = nextId(composition, 'tuning')
    onChange({
      ...composition,
      tuningContexts: [
        ...tuningContexts,
        {
          id,
          name: `Tuning ${tuningContexts.length + 1}`,
          rootFrequencyHz: 261.6255653005986,
          system: { kind: 'equal-temperament', divisions: 12 },
          octaveFold: true,
        },
      ],
    })
  }

  const addControlPart = () => {
    const id = nextId(composition, 'control')
    const part: PartSpec = {
      id,
      name: `Control ${controlParts.length + 1}`,
      enabled: true,
      mute: false,
      solo: false,
      kind: 'control',
      encounterQuery: {
        kinds: ['conjunction'],
        wheelIds: [],
        headIds: [],
        fieldIds: [],
        boundaryIds: [],
        directions: [],
        minStrength: 0,
        relationIds: relations[0] ? [relations[0].id] : [],
      },
      instrumentId: composition.instruments[0]?.id ?? '',
      control: {
        name: 'pan',
        source: 'distance',
        min: -1,
        max: 1,
        sampleRateHz: 30,
        smoothingSeconds: 0.1,
      },
    }
    commit([...composition.parts, part])
  }
  const boundaries = composition.fields.flatMap((field) =>
    field.boundaries.map((boundary) => ({
      id: boundary.id,
      label: `${field.name} / ${boundary.name}`,
    })),
  )
  const commit = (nextParts: Array<Composition['parts'][number]>) =>
    onChange({ ...composition, parts: nextParts })
  const update = (id: string, next: (part: NotePartSpec) => NotePartSpec) =>
    commit(
      composition.parts.map((part) =>
        part.id === id && part.kind === 'note' ? next(part) : part,
      ),
    )
  const addPart = () => {
    const index = nextPartIndex(composition)
    const instrumentId = composition.instruments[0]?.id ?? ''
    commit([
      ...composition.parts,
      {
        id: `part-${index}`,
        name: `Part ${index}`,
        enabled: true,
        mute: false,
        solo: false,
        kind: 'note',
        encounterQuery: {
          kinds: ['boundary-crossing'],
          // Every Wheel and every Head. Binding a new Part to the first of each
          // made it deaf to the rest of a multi-Wheel Composition, which looked
          // like a Part that produced no notes.
          wheelIds: [],
          headIds: [],
          fieldIds: [],
          boundaryIds: [],
          directions: [],
          minStrength: 0,
        },
        instrumentId,
        onset: { kind: 'encounter-time' },
        pitch: { kind: 'fixed-midi', note: 60 },
        velocity: { kind: 'encounter-strength', min: 48, max: 118, gamma: 1 },
        duration: { kind: 'fixed', beats: 0.25 },
        quantize: { gridBeats: 0.25, strength: 0.75 },
      },
    ])
  }

  return (
    <RailPanel
      label="Parts"
      title="Parts"
      actions={
        <div className="panel-actions">
          <button type="button" onClick={addPart}>Add Part</button>
          <button type="button" onClick={addRelation}>Add Relation</button>
          <button type="button" onClick={addControlPart}>Add Control</button>
          <button type="button" onClick={addTuningContext}>Add Tuning</button>
        </div>
      }
    >

      {tuningContexts.length > 0 && (
        <ol className="voice-list" aria-label="Tuning contexts">
          {tuningContexts.map((tuning) => (
            <li key={tuning.id} className="voice-row">
              <div className="voice-head">
                <span>{tuning.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${tuning.id}`}
                  onClick={() =>
                    onChange({
                      ...composition,
                      tuningContexts: tuningContexts.filter(
                        (item) => item.id !== tuning.id,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <label>
                <span>Root (Hz)</span>
                <input
                  aria-label={`Root frequency ${tuning.id}`}
                  type="number"
                  step={0.01}
                  min={0.01}
                  value={tuning.rootFrequencyHz}
                  onChange={(event) =>
                    onChange({
                      ...composition,
                      tuningContexts: tuningContexts.map((item) =>
                        item.id === tuning.id
                          ? {
                              ...item,
                              rootFrequencyHz: Math.max(
                                0.01,
                                Number(event.currentTarget.value),
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <label>
                <span>System</span>
                <select
                  aria-label={`Tuning system ${tuning.id}`}
                  value={tuning.system.kind}
                  onChange={(event) =>
                    onChange({
                      ...composition,
                      tuningContexts: tuningContexts.map((item) =>
                        item.id === tuning.id
                          ? {
                              ...item,
                              system:
                                event.currentTarget.value === 'rational'
                                  ? { kind: 'rational', maxDenominator: 64 }
                                  : { kind: 'equal-temperament', divisions: 12 },
                            }
                          : item,
                      ),
                    })
                  }
                >
                  <option value="equal-temperament">equal-temperament</option>
                  <option value="rational">rational (exact ratios)</option>
                </select>
              </label>
            </li>
          ))}
        </ol>
      )}

      {relations.length > 0 && (
        <ol className="voice-list" aria-label="Relations">
          {relations.map((relation) => (
            <li key={relation.id} className="voice-row">
              <div className="voice-head">
                <label className="voice-enable">
                  <input
                    aria-label={`Enable ${relation.id}`}
                    type="checkbox"
                    checked={relation.enabled}
                    onChange={(event) =>
                      updateRelation(relation.id, (current) => ({
                        ...current,
                        enabled: event.currentTarget.checked,
                      }))
                    }
                  />
                  <span>{relation.name}</span>
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${relation.id}`}
                  onClick={() =>
                    onChange({
                      ...composition,
                      relations: relations.filter(
                        (item) => item.id !== relation.id,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <label>
                <span>Kind</span>
                <select
                  aria-label={`Relation kind ${relation.id}`}
                  value={relation.kind}
                  onChange={(event) =>
                    updateRelation(relation.id, (current) => ({
                      ...current,
                      kind: event.currentTarget.value as RelationSpec['kind'],
                    }))
                  }
                >
                  {relationKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Threshold</span>
                <input
                  aria-label={`Threshold ${relation.id}`}
                  type="number"
                  step={1}
                  min={0}
                  value={relation.threshold}
                  onChange={(event) =>
                    updateRelation(relation.id, (current) => ({
                      ...current,
                      threshold: Math.max(0, Number(event.currentTarget.value)),
                    }))
                  }
                />
              </label>
              <label>
                <span>Hysteresis</span>
                <input
                  aria-label={`Hysteresis ${relation.id}`}
                  type="number"
                  step={1}
                  min={0}
                  value={relation.hysteresis}
                  onChange={(event) =>
                    updateRelation(relation.id, (current) => ({
                      ...current,
                      hysteresis: Math.max(0, Number(event.currentTarget.value)),
                    }))
                  }
                />
              </label>
              <label>
                <span>Min separation (s)</span>
                <input
                  aria-label={`Min separation ${relation.id}`}
                  type="number"
                  step={0.05}
                  min={0}
                  value={relation.minSeparationSeconds}
                  onChange={(event) =>
                    updateRelation(relation.id, (current) => ({
                      ...current,
                      minSeparationSeconds: Math.max(
                        0,
                        Number(event.currentTarget.value),
                      ),
                    }))
                  }
                />
              </label>
            </li>
          ))}
        </ol>
      )}

      {controlParts.length > 0 && (
        <ol className="voice-list" aria-label="Control Parts">
          {controlParts.map((part) => (
            <li key={part.id} className="voice-row">
              <div className="voice-head">
                <label className="voice-enable">
                  <input
                    aria-label={`Enable ${part.id}`}
                    type="checkbox"
                    checked={part.enabled}
                    onChange={(event) =>
                      commit(
                        composition.parts.map((item) =>
                          item.id === part.id
                            ? { ...item, enabled: event.currentTarget.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>{part.name}</span>
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${part.id}`}
                  onClick={() =>
                    commit(
                      composition.parts.filter((item) => item.id !== part.id),
                    )
                  }
                >
                  Remove
                </button>
              </div>
              <label>
                <span>Source</span>
                <select
                  aria-label={`Control source ${part.id}`}
                  value={part.control.source}
                  onChange={(event) =>
                    updateControl(part.id, (current) => ({
                      ...current,
                      control: {
                        ...current.control,
                        source: event.currentTarget
                          .value as ControlPartSpec['control']['source'],
                      },
                    }))
                  }
                >
                  {controlSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Relation</span>
                <select
                  aria-label={`Control relation ${part.id}`}
                  value={part.encounterQuery.relationIds?.[0] ?? ''}
                  onChange={(event) =>
                    updateControl(part.id, (current) => ({
                      ...current,
                      encounterQuery: {
                        ...current.encounterQuery,
                        relationIds: event.currentTarget.value
                          ? [event.currentTarget.value]
                          : [],
                      },
                    }))
                  }
                >
                  <option value="">Any enabled pair</option>
                  {relations.map((relation) => (
                    <option key={relation.id} value={relation.id}>
                      {relation.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Rate (Hz)</span>
                <input
                  aria-label={`Control rate ${part.id}`}
                  type="number"
                  step={1}
                  min={1}
                  value={part.control.sampleRateHz}
                  onChange={(event) =>
                    updateControl(part.id, (current) => ({
                      ...current,
                      control: {
                        ...current.control,
                        sampleRateHz: Math.max(
                          1,
                          Number(event.currentTarget.value),
                        ),
                      },
                    }))
                  }
                />
              </label>
            </li>
          ))}
        </ol>
      )}
      <ol className="voice-list">
        {parts.map((part) => (
          <li key={part.id} className="voice-row">
            <div className="voice-head">
              <label className="voice-enable">
                <input
                  aria-label={`Enable ${part.id}`}
                  type="checkbox"
                  checked={part.enabled}
                  onChange={(event) => update(part.id, (current) => ({ ...current, enabled: event.currentTarget.checked }))}
                />
                <span>{part.name}</span>
              </label>
              <button type="button" aria-label={`Remove ${part.id}`} onClick={() => commit(composition.parts.filter((item) => item.id !== part.id))}>Remove</button>
            </div>
            <label>
              <span>Name</span>
              <input aria-label={`Name ${part.id}`} value={part.name} onChange={(event) => update(part.id, (current) => ({ ...current, name: event.currentTarget.value }))} />
            </label>

            {/*
              Which Heads this Part hears. Checking nothing means every one —
              stated in words under each row, because an empty set reading as
              "all" is the opposite of what an empty set usually means.
            */}
            <fieldset className="query-scope">
              <legend>Listens to</legend>

              <div className="query-toggles" role="group" aria-label={`Wheels ${part.id}`}>
                {composition.wheels.map((wheel) => (
                  <label key={wheel.id} className="tree-toggle">
                    <input
                      type="checkbox"
                      aria-label={`${wheel.name} for ${part.id}`}
                      checked={part.encounterQuery.wheelIds.includes(wheel.id)}
                      onChange={() => update(part.id, (current) => ({ ...current, encounterQuery: withWheelToggled(current.encounterQuery, wheel) }))}
                    />
                    <span>{wheel.name}</span>
                  </label>
                ))}
              </div>
              <p className="panel-context">
                {part.encounterQuery.wheelIds.length === 0
                  ? `Every Wheel (${composition.wheels.length})`
                  : `${part.encounterQuery.wheelIds.length} of ${composition.wheels.length} Wheels`}
              </p>

              <div className="query-toggles" role="group" aria-label={`Heads ${part.id}`}>
                {headsInScope(composition, part.encounterQuery).map(({ wheel, head }) => (
                  <label key={head.id} className="tree-toggle">
                    <input
                      type="checkbox"
                      aria-label={`${wheel.name} ${head.name} for ${part.id}`}
                      checked={part.encounterQuery.headIds.includes(head.id)}
                      onChange={() => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, headIds: toggled(current.encounterQuery.headIds, head.id) } }))}
                    />
                    <span>{head.name}</span>
                  </label>
                ))}
              </div>
              <p className="panel-context">
                {part.encounterQuery.headIds.length === 0
                  ? 'Every Head on those Wheels'
                  : `${part.encounterQuery.headIds.length} Head(s)`}
              </p>
            </fieldset>

            <label>
              <span>Boundary</span>
              <select aria-label={`Boundary ${part.id}`} value={part.encounterQuery.boundaryIds[0] ?? ''} onChange={(event) => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, boundaryIds: event.currentTarget.value ? [event.currentTarget.value] : [] } }))}>
                <option value="">All boundaries</option>
                {boundaries.map((boundary) => <option key={boundary.id} value={boundary.id}>{boundary.label}</option>)}
              </select>
            </label>
            <label>
              <span>Direction</span>
              <select aria-label={`Direction ${part.id}`} value={part.encounterQuery.directions[0] ?? ''} onChange={(event) => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, directions: event.currentTarget.value ? [event.currentTarget.value as EncounterDirection] : [] } }))}>
                <option value="">Any direction</option>
                {directions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
              </select>
            </label>
            <label>
              <span>Instrument</span>
              <select aria-label={`Instrument ${part.id}`} value={part.instrumentId} onChange={(event) => update(part.id, (current) => ({ ...current, instrumentId: event.currentTarget.value }))}>
                {composition.instruments.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.name}</option>)}
              </select>
            </label>
            <label>
              <span>Pitch mapping</span>
              <select aria-label={`Pitch mapping ${part.id}`} value={part.pitch.kind === 'boundary-degree' ? 'boundary-degree' : 'fixed-midi'} onChange={(event) => update(part.id, (current) => ({ ...current, pitch: event.currentTarget.value === 'boundary-degree' ? { kind: 'boundary-degree', root: 48, scale: 'pentatonic-minor', octaves: 3 } : { kind: 'fixed-midi', note: 60 } }))}>
                <option value="boundary-degree">Boundary degree</option>
                <option value="fixed-midi">Fixed MIDI</option>
              </select>
            </label>
            {part.pitch.kind === 'fixed-midi' && (
              <NumberField label={`MIDI note ${part.id}`} shortLabel="MIDI note" value={part.pitch.note} min={0} max={127} step={1} onChange={(note) => update(part.id, (current) => ({ ...current, pitch: { kind: 'fixed-midi', note } }))} />
            )}
            {part.pitch.kind === 'boundary-degree' && (
              <>
                <NumberField label={`Root ${part.id}`} shortLabel="Root" value={part.pitch.root} min={0} max={127} step={1} onChange={(root) => update(part.id, (current) => current.pitch.kind === 'boundary-degree' ? { ...current, pitch: { ...current.pitch, root } } : current)} />
                <label>
                  <span>Scale</span>
                  <select aria-label={`Scale ${part.id}`} value={part.pitch.scale} onChange={(event) => update(part.id, (current) => current.pitch.kind === 'boundary-degree' ? { ...current, pitch: { ...current.pitch, scale: event.currentTarget.value as ScaleName } } : current)}>
                    {scaleNames.map((scale) => <option key={scale} value={scale}>{scale}</option>)}
                  </select>
                </label>
              </>
            )}
            <NumberField label={`Duration ${part.id}`} shortLabel="Duration (beats)" value={part.duration.kind === 'fixed' ? part.duration.beats : 0.25} min={0.01} step={0.05} onChange={(beats) => update(part.id, (current) => ({ ...current, duration: { kind: 'fixed', beats } }))} />
            <NumberField label={`Grid ${part.id}`} shortLabel="Grid (beats)" value={part.quantize?.gridBeats ?? 0.25} min={0.01} step={0.05} onChange={(gridBeats) => update(part.id, (current) => ({ ...current, quantize: { gridBeats, strength: current.quantize?.strength ?? 0.75 } }))} />
          </li>
        ))}
      </ol>
    </RailPanel>
  )
}

const nextPartIndex = (composition: Composition) => {
  const ids = new Set(composition.parts.map((part) => part.id))
  let index = composition.parts.length + 1
  while (ids.has(`part-${index}`)) index += 1
  return index
}

type NumberFieldProps = {
  label: string
  shortLabel: string
  value: number
  min: number
  max?: number
  step: number
  onChange: (value: number) => void
}

function NumberField({ label, shortLabel, value, min, max, step, onChange }: NumberFieldProps) {
  return (
    <label>
      <span>{shortLabel}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}
