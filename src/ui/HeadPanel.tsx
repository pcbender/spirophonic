import type { Composition, HeadAttachmentSpec, HeadSpec } from '../core/composition'

export type HeadPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

export function HeadPanel({ composition, onChange }: HeadPanelProps) {
  const wheel = composition.wheels[0]
  const head = wheel?.heads[0]
  if (!wheel || !head) return null

  const commit = (next: HeadSpec) =>
    onChange({
      ...composition,
      wheels: composition.wheels.map((candidate, wheelIndex) =>
        wheelIndex === 0
          ? {
              ...candidate,
              heads: candidate.heads.map((item, headIndex) =>
                headIndex === 0 ? next : item,
              ),
            }
          : candidate,
      ),
    })
  const patch = (next: Partial<HeadSpec>) => commit({ ...head, ...next })
  const patchAttachment = (next: Record<string, number>) =>
    commit({
      ...head,
      attachment: { ...head.attachment, ...next } as HeadAttachmentSpec,
    })

  return (
    <section className="control-panel" aria-label="Head controls">
      <h2>Head and Trace</h2>
      <label className="field">
        <span>Name</span>
        <input aria-label="Head name" value={head.name} onChange={(event) => patch({ name: event.currentTarget.value })} />
      </label>
      <NumberField label="Head phase (turns)" value={head.phaseOffset} step={0.01} onChange={(phaseOffset) => patch({ phaseOffset })} />
      <NumberField label="Offset X" value={head.offset.x} step={1} onChange={(x) => patch({ offset: { ...head.offset, x } })} />
      <NumberField label="Offset Y" value={head.offset.y} step={1} onChange={(y) => patch({ offset: { ...head.offset, y } })} />
      {head.attachment.kind === 'spirogram' && (
        <NumberField label="Pen offset" value={head.attachment.penOffset} min={0} step={1} onChange={(penOffset) => patchAttachment({ penOffset })} />
      )}
      {head.attachment.kind === 'lissajous' && (
        <>
          <NumberField label="Head scale X" value={head.attachment.scaleX} min={1} step={1} onChange={(scaleX) => patchAttachment({ scaleX })} />
          <NumberField label="Head scale Y" value={head.attachment.scaleY} min={1} step={1} onChange={(scaleY) => patchAttachment({ scaleY })} />
        </>
      )}
      {(head.attachment.kind === 'rose' || head.attachment.kind === 'superformula') && (
        <NumberField label="Radius scale" value={head.attachment.radiusScale} min={1} step={1} onChange={(radiusScale) => patchAttachment({ radiusScale })} />
      )}
      {head.attachment.kind === 'harmonograph' && (
        <NumberField label="Amplitude scale" value={head.attachment.amplitudeScale} min={0.01} step={0.05} onChange={(amplitudeScale) => patchAttachment({ amplitudeScale })} />
      )}
      <label className="field">
        <span>Trace color</span>
        <input aria-label="Trace color" type="color" value={head.trace.color} onChange={(event) => patch({ trace: { ...head.trace, color: event.currentTarget.value } })} />
      </label>
      <NumberField label="Trace width" value={head.trace.lineWidth} min={0.1} step={0.1} onChange={(lineWidth) => patch({ trace: { ...head.trace, lineWidth } })} />
      <NumberField label="Trace history (seconds)" value={head.trace.historySeconds} min={0} step={0.25} onChange={(historySeconds) => patch({ trace: { ...head.trace, historySeconds } })} />
    </section>
  )
}

type NumberFieldProps = {
  label: string
  value: number
  min?: number
  step: number
  onChange: (value: number) => void
}

function NumberField({ label, value, min, step, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input aria-label={label} type="number" value={value} min={min} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}
