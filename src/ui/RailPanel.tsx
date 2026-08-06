import { useCallback, useState, type ReactNode, type SyntheticEvent } from 'react'

/**
 * A titled, collapsible rail panel.
 *
 * The rails stack eleven panels between them and every one of them grows with
 * the Composition, so a rail is always taller than its cell. Collapsing is what
 * makes that tractable: a panel you are not working in costs one row.
 *
 * The disclosure lives *inside* the `<section>` rather than replacing it. A
 * `<section aria-label>` is a `region`, which is how panels are found by
 * assistive tech and by the browser suites; `<details>` is a `group` and would
 * silently take that away.
 *
 * Actions render under the title rather than beside it in the `<summary>`,
 * because a click on a button inside a summary bubbles and toggles the panel.
 */

const STORAGE_KEY = 'spirophonic.panels.v1'

type OpenMap = Record<string, boolean>

const readOpenMap = (): OpenMap => {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as OpenMap) : {}
  } catch {
    return {}
  }
}

const writeOpen = (label: string, open: boolean) => {
  try {
    const next = { ...readOpenMap(), [label]: open }
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Remembering which panels are open is a convenience, never a requirement.
  }
}

export type RailPanelProps = {
  /**
   * Names the region for assistive technology and keys its collapsed state.
   * Stable across renders — it is a storage key, not a display string.
   */
  label: string
  /** Shown in the disclosure header. May carry the selected object's name. */
  title: ReactNode
  /** Extra class on the section, for panels with their own layout rules. */
  className?: string
  /** Buttons belonging to the panel as a whole, rendered under the title. */
  actions?: ReactNode
  children: ReactNode
}

export function RailPanel({
  label,
  title,
  className,
  actions,
  children,
}: RailPanelProps) {
  // Absent means open: a new panel, or a new user, hides nothing.
  const [open, setOpen] = useState(() => readOpenMap()[label] ?? true)

  const handleToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      const next = event.currentTarget.open
      setOpen(next)
      writeOpen(label, next)
    },
    [label],
  )

  return (
    <section
      className={className ? `control-panel ${className}` : 'control-panel'}
      aria-label={label}
    >
      <details className="panel-disclosure" open={open} onToggle={handleToggle}>
        <summary title={open ? 'Collapse this panel' : 'Expand this panel'}>
          <h2>{title}</h2>
        </summary>
        {actions ? <div className="panel-header">{actions}</div> : null}
        {children}
      </details>
    </section>
  )
}
