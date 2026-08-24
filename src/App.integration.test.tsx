import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import * as api from './api/client'

vi.mock('./api/client')

describe('App integration', () => {
  it('logs an inquiry request and does not log background polling', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE', vaAcctNo: 'VA123' } })
    vi.mocked(api.listTransactions).mockResolvedValue({ status: 200, data: [] })
    vi.mocked(api.listRefunds).mockResolvedValue({ status: 200, data: [] })

    render(<App />)

    await userEvent.type(screen.getAllByLabelText(/va number/i)[0], 'VA123')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    expect(await screen.findByText('inquiry')).toBeInTheDocument()
    expect(screen.queryByText('No requests yet.')).not.toBeInTheDocument()
    expect(screen.queryAllByText('inquiry')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(api.listTransactions).toHaveBeenCalled()

    // The refresh must NOT add an Activity Log entry (guards Finding I-1's fix).
    expect(screen.queryAllByText('transactions')).toHaveLength(0)
    expect(screen.queryAllByText('refunds')).toHaveLength(0)
  })
})
