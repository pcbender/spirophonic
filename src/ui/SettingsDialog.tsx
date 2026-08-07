import { useCallback, useEffect, useRef, type ReactNode } from 'react'

import { help } from './help'

/**
 * The app's modal Settings surface.
 *
 * Setup belongs behind a door. Importing a bank, recording its licence, and
 * removing its bytes are things you do once and then never again while
 * composing; the controls that browse and assign its presets are things you do
 * constantly. Keeping both in one rail panel meant the rare controls sat on top
 * of the frequent ones forever.
 *
 * Built on `<dialog showModal()>` rather than a hand-rolled overlay: the
 * platform gives the focus trap, the inert background, the Escape key, and the
 * top layer, and every one of those is a thing an overlay gets subtly wrong.
 * Escape is still handled here, because the browser's default `cancel` closes
 * the element without telling React the state changed.
 */

export type SettingsDialogProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function SettingsDialog({ open, onClose, children }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      // jsdom through v27 ships <dialog> without showModal, so the unit suite
      // would otherwise be asserting against a panel that never opens. Falling
      // back to the `open` property shows it non-modally: no focus trap and no
      // inert background, but reachable rather than invisible. Real modality is
      // covered by the Playwright suite, which runs actual browsers.
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.open = true
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.open = false
    }
  }, [open])

  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      // Let React own the open state: without this the element closes itself
      // and the next `open` render finds it already shut and does nothing.
      event.preventDefault()
      onClose()
    },
    [onClose],
  )

  /**
   * A click that both starts and ends on the backdrop closes the dialog. The
   * target test is what makes it the backdrop rather than the panel: the
   * dialog element fills the viewport, and its children are what you see.
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onClose()
    },
    [onClose],
  )

  return (
    <dialog
      className="settings-dialog"
      ref={dialogRef}
      aria-label="Settings"
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="settings-dialog-frame">
        <header className="settings-dialog-head">
          <h2>Settings</h2>
          <button
            type="button"
            aria-label="Close settings"
            title={help['settings.close']}
            onClick={onClose}
          >
            Close
          </button>
        </header>
        {/* Mounted only while open. A closed dialog's content is still in the
            DOM and still found by name, so leaving it mounted would put a
            second copy of every bank card behind the workspace. */}
        <div className="settings-dialog-body">{open ? children : null}</div>
      </div>
    </dialog>
  )
}
