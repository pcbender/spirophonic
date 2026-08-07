import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { SettingsDialog } from './SettingsDialog'

afterEach(cleanup)

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Settings
      </button>
      <SettingsDialog
        open={open}
        onClose={() => {
          setOpen(false)
          onClose?.()
        }}
      >
        <p>Bank management lives here.</p>
      </SettingsDialog>
    </>
  )
}

describe('SettingsDialog', () => {
  it('opens as a modal and closes on the close button', () => {
    render(<Harness />)
    const dialog = screen.getByLabelText('Settings')

    expect(dialog).not.toHaveAttribute('open')
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(dialog).toHaveAttribute('open')

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(dialog).not.toHaveAttribute('open')
  })

  it('closes on Escape through React rather than letting the element close itself', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    const dialog = screen.getByLabelText('Settings')
    // The browser fires `cancel` on Escape. Handling it is what keeps React's
    // state and the element's own open flag from drifting apart.
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(onClose).toHaveBeenCalled()
    expect(dialog).not.toHaveAttribute('open')
  })

  it('closes on a backdrop click but not on a click inside the panel', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = screen.getByLabelText('Settings')

    fireEvent.click(screen.getByText('Bank management lives here.'))
    expect(dialog).toHaveAttribute('open')

    fireEvent.click(dialog)
    expect(dialog).not.toHaveAttribute('open')
  })

  it('mounts its content only while open', () => {
    render(<Harness />)
    // A closed <dialog> keeps its children in the DOM, where they are still
    // found by name. Anything mounted in here would otherwise be a second copy
    // of itself sitting invisibly behind the workspace.
    expect(
      screen.queryByText('Bank management lives here.'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText('Bank management lives here.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(
      screen.queryByText('Bank management lives here.'),
    ).not.toBeInTheDocument()
  })
})
