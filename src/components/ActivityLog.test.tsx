import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityLog } from './ActivityLog'
import type { LogEntry } from '../types'

const sampleEntry: LogEntry = {
  id: '1',
  timestamp: '2026-08-24T00:00:00.000Z',
  endpoint: 'inquiry',
  request: { vaAcctNo: 'VA123' },
  response: { status: 'ACTIVE' },
  status: 200,
  durationMs: 42,
}

describe('ActivityLog', () => {
  it('shows an empty state when there are no entries', () => {
    render(<ActivityLog log={[]} onClear={vi.fn()} />)
    expect(screen.getByText('No requests yet.')).toBeInTheDocument()
  })

  it('renders each log entry summary', () => {
    render(<ActivityLog log={[sampleEntry]} onClear={vi.fn()} />)
    expect(screen.getByText('inquiry')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('calls onClear when the clear button is clicked', async () => {
    const onClear = vi.fn()
    render(<ActivityLog log={[sampleEntry]} onClear={onClear} />)
    await userEvent.click(screen.getByRole('button', { name: /clear log/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
