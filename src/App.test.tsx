import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Spirophonic scaffold', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Spirophonic' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Relationship controls')).toBeInTheDocument()
  })
})
