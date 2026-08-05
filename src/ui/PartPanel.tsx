import type {
  Composition,
  EncounterDirection,
  NotePartSpec,
  ScaleName,
} from '../core/composition'
import { scaleNames } from '../core/scales'

export type PartPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const directions: Array<Extract<
  EncounterDirection,
  'inward' | 'outward' | 'clockwise' | 'counterclockwise'
>> = ['inward', 'outward', 'clockwise', 'counterclockwise']

export function PartPanel({ composition, onChange }: PartPanelProps) {
  const parts = composition.parts.filter(
    (part): part is NotePartSpec => part.kind === 'note',
  )
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
        kind: 'note',
        encounterQuery: {
          kinds: ['boundary-crossing'],
          wheelIds: [composition.wheels[0].id],
          headIds: [composition.wheels[0].heads[0].id],
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
    <section className="control-panel" aria-label="Parts">
      <div className="panel-header">
        <h2>Parts</h2>
        <button type="button" onClick={addPart}>Add Part</button>
      </div>
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
    </section>
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
