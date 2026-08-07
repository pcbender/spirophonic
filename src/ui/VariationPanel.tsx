import type { Composition, VariationSpec } from '../core/composition'
import { randomVersion } from '../core/random'
import { variationBounds } from '../core/variation'
import { help } from './help'
import { RailPanel } from './RailPanel'

export type VariationPanelProps = {
  composition: Composition
  onChange: (composition: Composition) => void
}

const layers = [
  ['initialConditions', 'Initial conditions', 'Wheel and Head phase, Field rotation'],
  ['interpretation', 'Interpretation', 'Pitch choice and note probability'],
  ['performance', 'Performance', 'Timing, velocity, and duration'],
] as const

const defaultVariation = (): VariationSpec => ({
  enabled: true,
  seed: 'spirophonic',
  version: randomVersion,
  initialConditions: { enabled: false, amount: 0.25 },
  interpretation: { enabled: false, amount: 0.25 },
  performance: { enabled: true, amount: 0.25 },
})

export function VariationPanel({ composition, onChange }: VariationPanelProps) {
  const variation = composition.variation

  const commit = (next: VariationSpec | undefined) =>
    onChange({ ...composition, variation: next })

  if (!variation) {
    return (
      <RailPanel
        label="Variation"
        title="Variation"
        actions={
          <button type="button" title={help['variation.enable']} onClick={() => commit(defaultVariation())}>
            Enable variation
          </button>
        }
      >
        <p>No variation. The compiler runs its exact unvaried path.</p>
      </RailPanel>
    )
  }

  const patch = (next: Partial<VariationSpec>) =>
    commit({ ...variation, ...next, version: randomVersion })

  return (
    <RailPanel
      label="Variation"
      title="Variation"
      actions={
        <button type="button" title={help['variation.remove']} onClick={() => commit(undefined)}>
          Remove
        </button>
      }
    >
      <label className="field">
        <span>Enabled</span>
        <input
          type="checkbox"
          title={help['variation.enabled']}
          aria-label="Variation enabled"
          checked={variation.enabled}
          onChange={(event) => patch({ enabled: event.currentTarget.checked })}
        />
      </label>

      <label className="field">
        <span>Seed</span>
        <input
          title={help['variation.seed']}
          aria-label="Variation seed"
          value={variation.seed}
          onChange={(event) => patch({ seed: event.currentTarget.value })}
        />
      </label>

      {layers.map(([key, label, hint]) => {
        const layer = variation[key] ?? { enabled: false, amount: 0.25 }
        return (
          <fieldset key={key} className="variation-layer">
            <legend>{label}</legend>
            <p className="panel-context">{hint}</p>
            <label className="field">
              <span>On</span>
              <input
                type="checkbox"
                title={help['variation.layerEnabled']}
                aria-label={`${label} enabled`}
                checked={layer.enabled}
                onChange={(event) =>
                  patch({ [key]: { ...layer, enabled: event.currentTarget.checked } })
                }
              />
            </label>
            <label className="field">
              <span>Amount</span>
              <input
                type="range"
                title={help['variation.amount']}
                aria-label={`${label} amount`}
                min={0}
                max={1}
                step={0.05}
                value={layer.amount}
                onChange={(event) =>
                  patch({
                    [key]: { ...layer, amount: Number(event.currentTarget.value) },
                  })
                }
              />
            </label>
          </fieldset>
        )
      })}

      <p className="panel-context">
        Randomness version {randomVersion}. At amount 1 timing moves up to{' '}
        {variationBounds.timingBeats} beats and velocity up to{' '}
        {variationBounds.velocity}.
      </p>
    </RailPanel>
  )
}
