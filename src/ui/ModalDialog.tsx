import { useCallback, useEffect, useRef, type ReactNode } from 'react'

import { help } from './help'

/**
 * The app's modal dialog.
 *
 * Two kinds of thing belong behind a door. Setup — importing a bank, recording
 * its licence — is done once and then not again while composing. A decision
 * attached to one action — whether a bundle carries its bank audio — belongs
 * with that action, not parked in the top bar being read on every glance.
 * Neither earns permanent space in a rail or a header.
 *
 * Built on `<dialog showModal()>` rather than a hand-rolled overlay: the
 * platform gives the focus trap, the inert background, the Escape key, and the
 * top layer, and every one of those is a thing an overlay gets subtly wrong.
 * Escape is still handled here, because the browser's default `cancel` closes
 * the element without telling React the state changed.
 */

export type ModalDialogProps = {
  open: boolean
  onClose: () => void
  /** Shown as the heading, and names the dialog for assistive technology. */
  title: string
  /** Extra class on the dialog, for a modal with its own width or layout. */
  className?: string
  /** Rendered in the footer, beside Close. */
  actions?: ReactNode
  children: ReactNode
}

export function ModalDialog({
  open,
  onClose,
  title,
  className,
  actions,
  children,
}: ModalDialogProps) {
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
   * A click that lands on the backdrop closes the dialog. The target test is
   * what makes it the backdrop rather than the panel: the dialog element fills
   * the viewport, and its children are what you see.
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onClose()
    },
    [onClose],
  )

  return (
    <dialog
      className={className ? `modal-dialog ${className}` : 'modal-dialog'}
      ref={dialogRef}
      aria-label={title}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      {/* Mounted only while open — the frame entire, not just the body. A
          closed <dialog> keeps its children in the DOM, where they are still
          found by role and name: a footer left mounted puts a second live
          "Export bundle" button behind the one that opens this. */}
      {open ? (
        <div className="modal-dialog-frame">
          <header className="modal-dialog-head">
            <h2>{title}</h2>
          </header>
          <div className="modal-dialog-body">{children}</div>
          <footer className="modal-dialog-actions">
            {actions}
            <button
              type="button"
              aria-label={`Close ${title.toLowerCase()}`}
              title={help['dialog.close']}
              onClick={onClose}
            >
              Close
            </button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
