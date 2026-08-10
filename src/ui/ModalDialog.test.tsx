import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { ModalDialog } from './ModalDialog'

afterEach(cleanup)

function Harness({
  onClose,
  actions,
}: {
  onClose?: () => void
  actions?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <ModalDialog
        open={open}
        onClose={() => {
          setOpen(false)
          onClose?.()
        }}
        title="Export bundle"
        actions={actions}
      >
        <p>The decision lives here.</p>
      </ModalDialog>
    </>
  )
}

describe('ModalDialog', () => {
  it('opens as a modal and closes on the close button', () => {
    render(<Harness />)
    const dialog = screen.getByLabelText('Export bundle')

    expect(dialog).not.toHaveAttribute('open')
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(dialog).toHaveAttribute('open')

    fireEvent.click(screen.getByRole('button', { name: 'Close export bundle' }))
    expect(dialog).not.toHaveAttribute('open')
  })

  it('closes on Escape through React rather than letting the element close itself', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    const dialog = screen.getByLabelText('Export bundle')
    // The browser fires `cancel` on Escape. Handling it is what keeps React's
    // state and the element's own open flag from drifting apart.
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(onClose).toHaveBeenCalled()
    expect(dialog).not.toHaveAttribute('open')
  })

  it('closes on a backdrop click but not on a click inside the panel', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByLabelText('Export bundle')

    fireEvent.click(screen.getByText('The decision lives here.'))
    expect(dialog).toHaveAttribute('open')

    fireEvent.click(dialog)
    expect(dialog).not.toHaveAttribute('open')
  })

  it('mounts its content only while open', () => {
    render(<Harness />)
    // A closed <dialog> keeps its children in the DOM, where they are still
    // found by name. Anything mounted in here would otherwise be a second copy
    // of itself sitting invisibly behind the workspace.
    expect(screen.queryByText('The decision lives here.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByText('The decision lives here.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close export bundle' }))
    expect(screen.queryByText('The decision lives here.')).not.toBeInTheDocument()
  })

  it('renders a confirming action beside Close', () => {
    const confirm = vi.fn()
    render(
      <Harness
        actions={
          <button type="button" onClick={confirm}>
            Do the thing
          </button>
        }
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    fireEvent.click(screen.getByRole('button', { name: 'Do the thing' }))
    expect(confirm).toHaveBeenCalled()
  })
})
