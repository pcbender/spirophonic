import type {
  Composition,
  ControlPartSpec,
  EncounterDirection,
  EncounterQuery,
  NotePartSpec,
  PartSpec,
  PitchMapping,
  RelationEventKind,
  RelationSpec,
  ScaleName,
  WheelSpec,
} from '../core/composition'
import { DEFAULT_MELODY_ROOT } from '../core/parts'
import { midiToName, scaleNames } from '../core/scales'
import { help } from './help'
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

type PartDurationKind = NotePartSpec['duration']['kind']

/** A complete duration of each kind, for when the dropdown switches. */
const durationFor = (kind: PartDurationKind): NotePartSpec['duration'] => {
  if (kind === 'until-next') return { kind, maxBeats: 4 }
  if (kind === 'inside-band') return { kind }
  return { kind: 'fixed', beats: 0.25 }
}

const toggled = (list: ReadonlyArray<string>, id: string) =>
  list.includes(id) ? list.filter((value) => value !== id) : [...list, id]

/** Every kind a note Part can accept, with a label that fits a narrow rail. */
const encounterKinds: ReadonlyArray<readonly [RelationEventKind, string]> = [
  ['boundary-crossing', 'boundary'],
  ['trace-crossing', 'trace'],
  ['conjunction', 'conjunction'],
  ['closest-approach', 'closest approach'],
  ['radial-alignment', 'radial align'],
  ['angular-alignment', 'angular align'],
  ['opposition', 'opposition'],
  ['direction-match', 'direction match'],
]

/**
 * What the current selection means, and when it cannot produce anything.
 *
 * Accepting a kind is not enough on its own: trace crossings need a Head that
 * observes its Trace, and the six Relation kinds need a Relation to detect
 * them. Both are configured in other panels, so a Part can be set up correctly
 * and stay silent for a reason that is nowhere in view. This says so here.
 */
const kindCaption = (
  composition: Composition,
  kinds: ReadonlyArray<RelationEventKind>,
) => {
  const unmet: Array<string> = []
  const observing = composition.wheels.flatMap((wheel) =>
    wheel.heads.filter(
      (head) => head.enabled && head.observation?.enabled === true,
    ),
  )
  // A Trace crossing needs a probe and a path, and both come from the observing
  // Heads. One observing Head can only cross its own Trace, and only if it is
  // allowed to — so one is not enough unless self-crossing is on.
  const canCrossTraces =
    observing.length > 1 ||
    observing.some((head) => head.observation?.allowSelf === true)
  const hasRelation = (composition.relations ?? []).some(
    (relation) => relation.enabled,
  )

  if (kinds.includes('trace-crossing') && !canCrossTraces) {
    unmet.push(
      observing.length === 0
        ? 'no Head observes its Trace'
        : 'only one Head observes its Trace, and it may not cross its own',
    )
  }
  if (
    kinds.some(
      (kind) => kind !== 'boundary-crossing' && kind !== 'trace-crossing',
    ) &&
    !hasRelation
  ) {
    unmet.push('no Relation exists yet')
  }

  const summary = `${kinds.length} of ${encounterKinds.length} kinds`
  return unmet.length > 0 ? `${summary} — silent: ${unmet.join('; ')}` : summary
}

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
          <button type="button" title={help['part.add']} onClick={addPart}>Add Part</button>
          <button type="button" title={help['part.addRelation']} onClick={addRelation}>Add Relation</button>
          <button type="button" title={help['part.addControl']} onClick={addControlPart}>Add Control</button>
          <button type="button" title={help['part.addTuning']} onClick={addTuningContext}>Add Tuning</button>
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
                  title={help['tuning.remove']}
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
              <label title={help['tuning.rootHz']}>
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
              <label title={help['tuning.system']}>
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
                  title={help['relation.enabled']}
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
                  title={help['relation.remove']}
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
              <label title={help['relation.kind']}>
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
              <label title={help['relation.threshold']}>
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
              <label title={help['relation.hysteresis']}>
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
              <label title={help['relation.minSeparation']}>
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
                  title={help['part.enabled']}
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
                  title={help['part.remove']}
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
              <label title={help['control.source']}>
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
              <label title={help['control.relation']}>
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
              <label title={help['control.rate']}>
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
                  title={help['part.enabled']}
                  aria-label={`Enable ${part.id}`}
                  type="checkbox"
                  checked={part.enabled}
                  onChange={(event) => update(part.id, (current) => ({ ...current, enabled: event.currentTarget.checked }))}
                />
                <span>{part.name}</span>
              </label>
              <button type="button" title={help['part.remove']}
                  aria-label={`Remove ${part.id}`} onClick={() => commit(composition.parts.filter((item) => item.id !== part.id))}>Remove</button>
            </div>
            <label>
              <span>Name</span>
              <input title={help['part.name']}
                  aria-label={`Name ${part.id}`} value={part.name} onChange={(event) => update(part.id, (current) => ({ ...current, name: event.currentTarget.value }))} />
            </label>

            {/*
              Which Heads this Part hears. Checking nothing means every one —
              stated in words under each row, because an empty set reading as
              "all" is the opposite of what an empty set usually means.
            */}
            <fieldset className="query-scope">
              <legend title={help['part.wheels']}>Listens to</legend>

              <div className="query-toggles" role="group" aria-label={`Kinds ${part.id}`} title={help['part.kinds']}>
                {encounterKinds.map(([kind, label]) => (
                  <label key={kind} className="tree-toggle">
                    <input
                      type="checkbox"
                      aria-label={`${label} for ${part.id}`}
                      checked={part.encounterQuery.kinds.includes(kind)}
                      onChange={() => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, kinds: toggled(current.encounterQuery.kinds, kind) as Array<RelationEventKind> } }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p className="panel-context">
                {part.encounterQuery.kinds.length === 0
                  ? 'Every kind of Encounter'
                  : kindCaption(composition, part.encounterQuery.kinds)}
              </p>

              <div className="query-toggles" role="group" aria-label={`Wheels ${part.id}`} title={help['part.wheels']}>
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

              <div className="query-toggles" role="group" aria-label={`Heads ${part.id}`} title={help['part.heads']}>
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

              {relations.length > 0 &&
                part.encounterQuery.kinds.some((kind) => relationKinds.includes(kind as RelationSpec['kind'])) && (
                <>
                  <div className="query-toggles" role="group" aria-label={`Relations ${part.id}`} title={help['part.relations']}>
                    {relations.map((relation) => (
                      <label key={relation.id} className="tree-toggle">
                        <input
                          type="checkbox"
                          aria-label={`${relation.name} for ${part.id}`}
                          checked={(part.encounterQuery.relationIds ?? []).includes(relation.id)}
                          onChange={() => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, relationIds: toggled(current.encounterQuery.relationIds ?? [], relation.id) } }))}
                        />
                        <span>{relation.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="panel-context">
                    {(part.encounterQuery.relationIds ?? []).length === 0
                      ? 'Every Relation of the kinds above'
                      : `${(part.encounterQuery.relationIds ?? []).length} named Relation(s)`}
                  </p>
                </>
              )}

              <NumberField label={`Minimum strength ${part.id}`} shortLabel="Min strength" hint={help['part.minStrength']} value={part.encounterQuery.minStrength} min={0} max={1} step={0.05} onChange={(minStrength) => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, minStrength } }))} />
            </fieldset>

            <label title={help['part.boundary']}>
              <span>Boundary</span>
              <select aria-label={`Boundary ${part.id}`} value={part.encounterQuery.boundaryIds[0] ?? ''} onChange={(event) => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, boundaryIds: event.currentTarget.value ? [event.currentTarget.value] : [] } }))}>
                <option value="">All boundaries</option>
                {boundaries.map((boundary) => <option key={boundary.id} value={boundary.id}>{boundary.label}</option>)}
              </select>
            </label>
            <label title={help['part.direction']}>
              <span>Direction</span>
              <select aria-label={`Direction ${part.id}`} value={part.encounterQuery.directions[0] ?? ''} onChange={(event) => update(part.id, (current) => ({ ...current, encounterQuery: { ...current.encounterQuery, directions: event.currentTarget.value ? [event.currentTarget.value as EncounterDirection] : [] } }))}>
                <option value="">Any direction</option>
                {directions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
              </select>
            </label>
            <label title={help['part.instrument']}>
              <span>Instrument</span>
              <select aria-label={`Instrument ${part.id}`} value={part.instrumentId} onChange={(event) => update(part.id, (current) => ({ ...current, instrumentId: event.currentTarget.value }))}>
                {composition.instruments.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.name}</option>)}
              </select>
            </label>
            <label title={help['part.pitchMapping']}>
              <span>Pitch mapping</span>
              <select aria-label={`Pitch mapping ${part.id}`} value={part.pitch.kind} onChange={(event) => update(part.id, (current) => ({ ...current, pitch: defaultPitchFor(event.currentTarget.value as PitchMapping['kind']) }))}>
                {pitchKinds.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
              </select>
            </label>
            <PitchControls
              part={part}
              composition={composition}
              onPitch={(pitch) => update(part.id, (current) => ({ ...current, pitch }))}
              onTuningContext={(tuningContextId) =>
                update(part.id, (current) => ({ ...current, tuningContextId }))
              }
            />

            <label title={help['part.velocityKind']}>
              <span>Velocity</span>
              <select
                aria-label={`Velocity ${part.id}`}
                value={part.velocity.kind}
                onChange={(event) => update(part.id, (current) => ({ ...current, velocity: event.currentTarget.value === 'constant' ? { kind: 'constant', value: 96 } : { kind: 'encounter-strength', min: 48, max: 118, gamma: 1 } }))}
              >
                <option value="encounter-strength">From Encounter strength</option>
                <option value="constant">Constant</option>
              </select>
            </label>
            {part.velocity.kind === 'constant' ? (
              <NumberField label={`Velocity value ${part.id}`} shortLabel="Velocity" hint={help['part.velocityValue']} value={part.velocity.value} min={1} max={127} step={1} onChange={(value) => update(part.id, (current) => ({ ...current, velocity: { kind: 'constant', value } }))} />
            ) : (
              <>
                <NumberField label={`Velocity min ${part.id}`} shortLabel="Vel min" hint={help['part.velocityMin']} value={part.velocity.min} min={1} max={127} step={1} onChange={(min) => update(part.id, (current) => current.velocity.kind === 'encounter-strength' ? { ...current, velocity: { ...current.velocity, min } } : current)} />
                <NumberField label={`Velocity max ${part.id}`} shortLabel="Vel max" hint={help['part.velocityMax']} value={part.velocity.max} min={1} max={127} step={1} onChange={(max) => update(part.id, (current) => current.velocity.kind === 'encounter-strength' ? { ...current, velocity: { ...current.velocity, max } } : current)} />
                <NumberField label={`Velocity gamma ${part.id}`} shortLabel="Vel curve" hint={help['part.velocityGamma']} value={part.velocity.gamma} min={0.05} max={10} step={0.05} onChange={(gamma) => update(part.id, (current) => current.velocity.kind === 'encounter-strength' ? { ...current, velocity: { ...current.velocity, gamma } } : current)} />
              </>
            )}

            <label title={help['part.durationKind']}>
              <span>Duration</span>
              <select
                aria-label={`Duration kind ${part.id}`}
                value={part.duration.kind}
                onChange={(event) => update(part.id, (current) => ({ ...current, duration: durationFor(event.currentTarget.value as PartDurationKind) }))}
              >
                <option value="fixed">Fixed</option>
                <option value="until-next">Until next note</option>
                <option value="inside-band">Time inside a band</option>
              </select>
            </label>
            {part.duration.kind === 'fixed' && (
              <NumberField label={`Duration ${part.id}`} shortLabel="Duration (beats)" hint={help['part.duration']} value={part.duration.beats} min={0.01} max={10_000} step={0.05} onChange={(beats) => update(part.id, (current) => ({ ...current, duration: { kind: 'fixed', beats } }))} />
            )}
            {part.duration.kind === 'until-next' && (
              <NumberField label={`Max duration ${part.id}`} shortLabel="Max (beats)" hint={help['part.maxBeats']} value={part.duration.maxBeats} min={0.01} max={10_000} step={0.25} onChange={(maxBeats) => update(part.id, (current) => ({ ...current, duration: { kind: 'until-next', maxBeats } }))} />
            )}

            <NumberField label={`Grid ${part.id}`} shortLabel="Grid (beats)" hint={help['part.grid']} value={part.quantize?.gridBeats ?? 0.25} min={0.01} max={10_000} step={0.05} onChange={(gridBeats) => update(part.id, (current) => ({ ...current, quantize: { gridBeats, strength: current.quantize?.strength ?? 0.75 } }))} />
            <NumberField label={`Grid strength ${part.id}`} shortLabel="Grid pull" hint={help['part.quantizeStrength']} value={part.quantize?.strength ?? 0.75} min={0} max={1} step={0.05} onChange={(strength) => update(part.id, (current) => ({ ...current, quantize: { gridBeats: current.quantize?.gridBeats ?? 0.25, strength } }))} />
          </li>
        ))}
      </ol>
    </RailPanel>
  )
}

/** Every pitch mapping the format defines, with a label for the dropdown. */
const pitchKinds: ReadonlyArray<readonly [PitchMapping['kind'], string]> = [
  ['fixed-midi', 'Fixed MIDI'],
  ['fixed-frequency', 'Fixed frequency'],
  ['boundary-degree', 'Boundary degree'],
  ['spatial', 'Spatial'],
  ['contour', 'Contour'],
  ['melodic-contour', 'Melodic line'],
  ['ratio', 'Ratio'],
  ['tuned-ratio', 'Tuned ratio'],
]

const spatialSources: ReadonlyArray<'x' | 'y' | 'radius' | 'angle'> = [
  'x',
  'y',
  'radius',
  'angle',
]

/**
 * A valid mapping of each kind, used when the dropdown switches.
 *
 * Switching kind cannot carry the old parameters across — the shapes barely
 * overlap — so each arrives complete and playable rather than half-filled and
 * rejected by validation.
 */
const defaultPitchFor = (kind: PitchMapping['kind']): PitchMapping => {
  if (kind === 'fixed-frequency') return { kind, frequencyHz: 440 }
  if (kind === 'boundary-degree') {
    return { kind, root: 48, scale: 'pentatonic-minor', octaves: 3 }
  }
  if (kind === 'ratio') return { kind, rootFrequencyHz: 261.63, octaveFold: true }
  if (kind === 'spatial' || kind === 'contour') {
    return { kind, source: 'radius', root: 48, scale: 'pentatonic-minor', octaves: 3 }
  }
  if (kind === 'melodic-contour') {
    return {
      kind,
      source: 'radius',
      scale: 'pentatonic-minor',
      // New Parts anchor to the bar. Unanchored, the walk's running degree
      // drifts across a periodic Wheel and the line never repeats, which is
      // the opposite of what an instrument built on cyclic relationship
      // should default to.
      anchor: 'bar',
      contour: {
        maxStep: 2,
        directionBias: 0.7,
        lowDegree: 0,
        highDegree: 12,
        startDegree: 4,
      },
    }
  }
  if (kind === 'tuned-ratio') {
    return { kind, ratio: { kind: 'explicit', numerator: 3, denominator: 2 } }
  }
  return { kind: 'fixed-midi', note: 60 }
}

type PitchControlsProps = {
  part: NotePartSpec
  composition: Composition
  onPitch: (pitch: PitchMapping) => void
  /** Separate from onPitch: the context lives on the Part, not the mapping. */
  onTuningContext: (tuningContextId: string | undefined) => void
}

/**
 * The parameters belonging to whichever pitch mapping is selected.
 *
 * Split out because eight mappings inline would bury the rest of the Part row.
 * Each branch edits its own shape and never reaches for fields another kind
 * owns, which is what keeps a switch from producing an invalid Composition.
 */
function PitchControls({
  part,
  composition,
  onPitch,
  onTuningContext,
}: PitchControlsProps) {
  const pitch = part.pitch

  const scaleSelect = (
    value: ScaleName,
    onScale: (scale: ScaleName) => void,
  ) => (
    <label title={help['part.scale']}>
      <span>Scale</span>
      <select
        aria-label={`Scale ${part.id}`}
        value={value}
        onChange={(event) => onScale(event.currentTarget.value as ScaleName)}
      >
        {scaleNames.map((scale) => (
          <option key={scale} value={scale}>{scale}</option>
        ))}
      </select>
    </label>
  )

  const sourceSelect = (
    value: 'x' | 'y' | 'radius' | 'angle',
    onSource: (source: 'x' | 'y' | 'radius' | 'angle') => void,
  ) => (
    <label title={help['part.pitchSource']}>
      <span>Source</span>
      <select
        aria-label={`Pitch source ${part.id}`}
        value={value}
        onChange={(event) =>
          onSource(event.currentTarget.value as 'x' | 'y' | 'radius' | 'angle')
        }
      >
        {spatialSources.map((source) => (
          <option key={source} value={source}>{source}</option>
        ))}
      </select>
    </label>
  )

  if (pitch.kind === 'fixed-midi') {
    return (
      <NumberField label={`MIDI note ${part.id}`} shortLabel="MIDI note" hint={help['part.midiNote']} value={pitch.note} min={0} max={127} step={1} onChange={(note) => onPitch({ kind: 'fixed-midi', note })} />
    )
  }

  if (pitch.kind === 'fixed-frequency') {
    return (
      <NumberField label={`Frequency ${part.id}`} shortLabel="Frequency (Hz)" hint={help['part.frequencyHz']} value={pitch.frequencyHz} min={1} max={20_000} step={1} onChange={(frequencyHz) => onPitch({ kind: 'fixed-frequency', frequencyHz })} />
    )
  }

  if (pitch.kind === 'boundary-degree') {
    return (
      <>
        <RootField label={`Root ${part.id}`} value={pitch.root} onChange={(root) => onPitch({ ...pitch, root })} />
        {scaleSelect(pitch.scale, (scale) => onPitch({ ...pitch, scale }))}
        <NumberField label={`Octaves ${part.id}`} shortLabel="Octaves" hint={help['part.octaves']} value={pitch.octaves} min={0} max={10} step={1} onChange={(octaves) => onPitch({ ...pitch, octaves })} />
      </>
    )
  }

  if (pitch.kind === 'spatial' || pitch.kind === 'contour') {
    return (
      <>
        {sourceSelect(pitch.source, (source) => onPitch({ ...pitch, source }))}
        <RootField label={`Root ${part.id}`} value={pitch.root} onChange={(root) => onPitch({ ...pitch, root })} />
        {scaleSelect(pitch.scale, (scale) => onPitch({ ...pitch, scale }))}
        <NumberField label={`Octaves ${part.id}`} shortLabel="Octaves" hint={help['part.octaves']} value={pitch.octaves} min={0} max={10} step={1} onChange={(octaves) => onPitch({ ...pitch, octaves })} />
      </>
    )
  }

  if (pitch.kind === 'melodic-contour') {
    const contour = pitch.contour
    return (
      <>
        {sourceSelect(pitch.source, (source) => onPitch({ ...pitch, source }))}
        {scaleSelect(pitch.scale, (scale) => onPitch({ ...pitch, scale }))}
        {/*
          This mapping had a scale and no root: the compiler pinned degree 0 to
          middle C. Choosing dorian without choosing what it was dorian *on*
          was the one place the key really was unreachable.
        */}
        <RootField
          label={`Root ${part.id}`}
          value={pitch.root ?? DEFAULT_MELODY_ROOT}
          onChange={(root) => onPitch({ ...pitch, root })}
        />
        <label title={help['part.melodyAnchor']}>
          <span>Restart</span>
          <select
            aria-label={`Melody anchor ${part.id}`}
            value={pitch.anchor}
            onChange={(event) =>
              onPitch({
                ...pitch,
                anchor: event.currentTarget.value as 'none' | 'bar',
              })
            }
          >
            <option value="bar">Each bar</option>
            <option value="none">Never — let it drift</option>
          </select>
        </label>
        <NumberField label={`Max step ${part.id}`} shortLabel="Max step" hint={help['part.maxStep']} value={contour.maxStep} min={0} max={64} step={1} onChange={(maxStep) => onPitch({ ...pitch, contour: { ...contour, maxStep } })} />
        <NumberField label={`Direction bias ${part.id}`} shortLabel="Direction bias" hint={help['part.directionBias']} value={contour.directionBias} min={0} max={1} step={0.05} onChange={(directionBias) => onPitch({ ...pitch, contour: { ...contour, directionBias } })} />
        <NumberField label={`Low degree ${part.id}`} shortLabel="Low degree" hint={help['part.lowDegree']} value={contour.lowDegree} min={-128} max={128} step={1} onChange={(lowDegree) => onPitch({ ...pitch, contour: { ...contour, lowDegree } })} />
        <NumberField label={`High degree ${part.id}`} shortLabel="High degree" hint={help['part.highDegree']} value={contour.highDegree} min={-128} max={128} step={1} onChange={(highDegree) => onPitch({ ...pitch, contour: { ...contour, highDegree } })} />
        <NumberField label={`Start degree ${part.id}`} shortLabel="Start degree" hint={help['part.startDegree']} value={contour.startDegree} min={-128} max={128} step={1} onChange={(startDegree) => onPitch({ ...pitch, contour: { ...contour, startDegree } })} />
      </>
    )
  }

  if (pitch.kind === 'ratio') {
    return (
      <>
        <NumberField label={`Ratio root ${part.id}`} shortLabel="Root (Hz)" hint={help['part.ratioRoot']} value={pitch.rootFrequencyHz} min={1} max={20_000} step={1} onChange={(rootFrequencyHz) => onPitch({ ...pitch, rootFrequencyHz })} />
        <label title={help['part.octaveFold']}>
          <span>Octave fold</span>
          <input
            type="checkbox"
            aria-label={`Octave fold ${part.id}`}
            checked={pitch.octaveFold}
            onChange={(event) => onPitch({ ...pitch, octaveFold: event.currentTarget.checked })}
          />
        </label>
      </>
    )
  }

  // tuned-ratio
  const ratio = pitch.ratio
  return (
    <>
      {/*
        The one place a tuning context is consumed: `mapEncounterPitch` reads
        it only on this branch. Rendering it here rather than beside the Part's
        other fields keeps it from looking like it governs the other seven
        mappings, which it does not.
      */}
      <label title={help['part.tuningContext']}>
        <span>Tuning</span>
        <select
          aria-label={`Tuning context ${part.id}`}
          value={part.tuningContextId ?? ''}
          onChange={(event) =>
            onTuningContext(event.currentTarget.value || undefined)
          }
        >
          <option value="">Default — C4, 12-TET</option>
          {(composition.tuningContexts ?? []).map((tuning) => (
            <option key={tuning.id} value={tuning.id}>{tuning.name}</option>
          ))}
        </select>
      </label>
      <label title={help['part.ratioSource']}>
        <span>Ratio from</span>
        <select
          aria-label={`Ratio source ${part.id}`}
          value={ratio.kind}
          onChange={(event) =>
            onPitch({
              ...pitch,
              ratio:
                event.currentTarget.value === 'wheel-motion'
                  ? {
                      kind: 'wheel-motion',
                      wheelId: composition.wheels[0]?.id ?? '',
                    }
                  : { kind: 'explicit', numerator: 3, denominator: 2 },
            })
          }
        >
          <option value="explicit">Explicit ratio</option>
          <option value="wheel-motion">Wheel motion</option>
        </select>
      </label>
      {ratio.kind === 'explicit' ? (
        <>
          <NumberField label={`Numerator ${part.id}`} shortLabel="Numerator" hint={help['part.ratioNumerator']} value={ratio.numerator} min={1} max={10_000} step={1} onChange={(numerator) => onPitch({ ...pitch, ratio: { ...ratio, numerator } })} />
          <NumberField label={`Denominator ${part.id}`} shortLabel="Denominator" hint={help['part.ratioDenominator']} value={ratio.denominator} min={1} max={10_000} step={1} onChange={(denominator) => onPitch({ ...pitch, ratio: { ...ratio, denominator } })} />
        </>
      ) : (
        <label title={help['part.ratioWheel']}>
          <span>Ratio Wheel</span>
          <select
            aria-label={`Ratio Wheel ${part.id}`}
            value={ratio.wheelId}
            onChange={(event) => onPitch({ ...pitch, ratio: { ...ratio, wheelId: event.currentTarget.value } })}
          >
            {composition.wheels.map((wheel) => (
              <option key={wheel.id} value={wheel.id}>{wheel.name}</option>
            ))}
          </select>
        </label>
      )}
    </>
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
  /** Hover help. See `./help`. */
  hint?: string
  onChange: (value: number) => void
}

/**
 * A root note, shown as a note name.
 *
 * The value stored is a MIDI number and stays one — it is what every scale
 * helper takes. But "Root 48" is not a root note to a musician reading a
 * panel, which is why this control was reported as missing when it had been
 * there all along. The label carries the name and tracks the number.
 */
function RootField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (root: number) => void
}) {
  return (
    <label title={help['part.root']}>
      <span>Root ({midiToName(value)})</span>
      <input
        aria-label={label}
        type="number"
        value={value}
        min={0}
        max={127}
        step={1}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  )
}

function NumberField({ label, shortLabel, value, min, max, step, hint, onChange }: NumberFieldProps) {
  return (
    <label title={hint}>
      <span>{shortLabel}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}
