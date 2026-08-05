import type {
  Composition,
  HeadAttachmentSpec,
  MotionSpec,
  WheelSpec,
} from '../core/composition'

export type WheelPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const motionKinds: Array<MotionSpec['kind']> = [
  'spirogram',
  'lissajous',
  'rose',
  'superformula',
  'harmonograph',
]

export function WheelPanel({ composition, onChange }: WheelPanelProps) {
  const wheel = composition.wheels[0]
  if (!wheel) return null

  const commit = (next: WheelSpec) =>
    onChange({
      ...composition,
      wheels: composition.wheels.map((item, index) =>
        index === 0 ? next : item,
      ),
    })
  const patch = (next: Partial<WheelSpec>) => commit({ ...wheel, ...next })
  const patchMotion = (next: Partial<MotionSpec>) =>
    commit({ ...wheel, motion: { ...wheel.motion, ...next } as MotionSpec })
  const changeMotion = (kind: MotionSpec['kind']) => {
    const { motion, attachment } = motionDefaults(kind)
    commit({
      ...wheel,
      motion,
      heads: wheel.heads.map((head) => ({ ...head, attachment })),
    })
  }

  return (
    <section className="control-panel" aria-label="Wheel controls">
      <h2>Wheel</h2>
      <label className="field">
        <span>Name</span>
        <input
          aria-label="Wheel name"
          value={wheel.name}
          onChange={(event) => patch({ name: event.currentTarget.value })}
        />
      </label>
      <label className="field">
        <span>Motion</span>
        <select
          aria-label="Wheel motion"
          value={wheel.motion.kind}
          onChange={(event) =>
            changeMotion(event.currentTarget.value as MotionSpec['kind'])
          }
        >
          {motionKinds.map((kind) => (
            <option key={kind} value={kind}>{kind}</option>
          ))}
        </select>
      </label>
      <NumberField
        label="Cycles"
        value={wheel.rate.cycles}
        min={0.01}
        step={0.25}
        onChange={(cycles) => patch({ rate: { ...wheel.rate, cycles } })}
      />
      <NumberField
        label="Cycle beats"
        value={wheel.rate.beats}
        min={0.01}
        step={0.25}
        onChange={(beats) => patch({ rate: { ...wheel.rate, beats } })}
      />
      <NumberField
        label="Wheel phase (turns)"
        value={wheel.phase}
        step={0.01}
        onChange={(phase) => patch({ phase })}
      />
      <label className="field">
        <span>Direction</span>
        <select
          aria-label="Wheel direction"
          value={wheel.direction}
          onChange={(event) =>
            patch({ direction: event.currentTarget.value as WheelSpec['direction'] })
          }
        >
          <option value="forward">Forward</option>
          <option value="reverse">Reverse</option>
        </select>
      </label>

      {wheel.motion.kind === 'spirogram' && (
        <>
          <NumberField label="Fixed radius" value={wheel.motion.fixedRadius} min={1} step={1} onChange={(fixedRadius) => patchMotion({ fixedRadius })} />
          <NumberField label="Moving radius" value={wheel.motion.movingRadius} min={1} step={1} onChange={(movingRadius) => patchMotion({ movingRadius })} />
          <label className="field">
            <span>Rotation</span>
            <select aria-label="Wheel rotation" value={wheel.motion.rotation} onChange={(event) => patchMotion({ rotation: event.currentTarget.value as 'inside' | 'outside' })}>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
          </label>
        </>
      )}
      {wheel.motion.kind === 'lissajous' && (
        <>
          <NumberField label="X frequency" value={wheel.motion.frequencyX} min={0.01} step={0.1} onChange={(frequencyX) => patchMotion({ frequencyX })} />
          <NumberField label="Y frequency" value={wheel.motion.frequencyY} min={0.01} step={0.1} onChange={(frequencyY) => patchMotion({ frequencyY })} />
          <NumberField label="Delta (rad)" value={wheel.motion.delta} step={0.01} onChange={(delta) => patchMotion({ delta })} />
        </>
      )}
      {wheel.motion.kind === 'rose' && (
        <>
          <NumberField label="Numerator" value={wheel.motion.numerator} min={1} step={1} onChange={(numerator) => patchMotion({ numerator })} />
          <NumberField label="Denominator" value={wheel.motion.denominator} min={1} step={1} onChange={(denominator) => patchMotion({ denominator })} />
        </>
      )}
      {wheel.motion.kind === 'superformula' && (
        <>
          <NumberField label="Symmetry" value={wheel.motion.symmetry} min={0} step={1} onChange={(symmetry) => patchMotion({ symmetry })} />
          <NumberField label="N1" value={wheel.motion.n1} min={0.01} step={0.05} onChange={(n1) => patchMotion({ n1 })} />
          <NumberField label="N2" value={wheel.motion.n2} min={0.01} step={0.05} onChange={(n2) => patchMotion({ n2 })} />
          <NumberField label="N3" value={wheel.motion.n3} min={0.01} step={0.05} onChange={(n3) => patchMotion({ n3 })} />
        </>
      )}
      {wheel.motion.kind === 'harmonograph' && (
        <>
          <NumberField label="X frequency" value={wheel.motion.frequencyX} min={0.01} step={0.01} onChange={(frequencyX) => patchMotion({ frequencyX })} />
          <NumberField label="Y frequency" value={wheel.motion.frequencyY} min={0.01} step={0.01} onChange={(frequencyY) => patchMotion({ frequencyY })} />
          <NumberField label="Damping" value={wheel.motion.damping} min={0} step={0.005} onChange={(damping) => patchMotion({ damping })} />
        </>
      )}
    </section>
  )
}

const motionDefaults = (
  kind: MotionSpec['kind'],
): { motion: MotionSpec; attachment: HeadAttachmentSpec } => {
  switch (kind) {
    case 'spirogram':
      return {
        motion: { kind, fixedRadius: 180, movingRadius: 65, rotation: 'inside' },
        attachment: { kind, penOffset: 95 },
      }
    case 'lissajous':
      return {
        motion: { kind, frequencyX: 3, frequencyY: 2, delta: Math.PI / 2 },
        attachment: { kind, scaleX: 180, scaleY: 180, phaseX: 0, phaseY: 0 },
      }
    case 'rose':
      return {
        motion: { kind, numerator: 5, denominator: 1 },
        attachment: { kind, radiusScale: 180, angularOffset: 0 },
      }
    case 'superformula':
      return {
        motion: { kind, symmetry: 6, n1: 0.3, n2: 0.3, n3: 0.3 },
        attachment: { kind, radiusScale: 180, angularOffset: 0 },
      }
    case 'harmonograph':
      return {
        motion: {
          kind,
          frequencyX: 3.01,
          frequencyY: 2,
          delta: Math.PI / 2,
          damping: 0.02,
          amplitudeX: 180,
          amplitudeY: 180,
        },
        attachment: { kind, amplitudeScale: 1, phaseX: 0, phaseY: 0 },
      }
  }
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
