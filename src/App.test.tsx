import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the simulator heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /va bank app simulator/i, level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders all four panels', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /^inquiry$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^payment$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^state$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /activity log/i })).toBeInTheDocument()
  })
})
