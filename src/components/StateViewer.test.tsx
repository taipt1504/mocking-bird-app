import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StateViewer } from './StateViewer'

describe('StateViewer', () => {
  it('renders transactions and refunds after clicking Refresh', async () => {
    const fetchTransactions = vi.fn().mockResolvedValue([
      {
        id: 1,
        msgId: 'm',
        itemId: 'i',
        endToEndId: 'e',
        vaAcctNo: 'VA123',
        amount: 1000,
        status: 'NOTIFIED',
        createdAt: '2026-08-24',
      },
    ])
    const fetchRefunds = vi.fn().mockResolvedValue([
      { id: 1, txId: 'TX1', amount: 1000, status: 'COMPLETED', remark: 'AUTH', createdAt: '2026-08-24' },
    ])

    render(<StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />)
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(await screen.findByText('VA123')).toBeInTheDocument()
    expect(await screen.findByText('TX1')).toBeInTheDocument()
  })

  it('does not fetch automatically until the auto-poll toggle is checked', () => {
    const fetchTransactions = vi.fn().mockResolvedValue([])
    const fetchRefunds = vi.fn().mockResolvedValue([])

    render(<StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />)

    expect(fetchTransactions).not.toHaveBeenCalled()
    expect(fetchRefunds).not.toHaveBeenCalled()
  })

  it('shows an alert when a Refresh fails', async () => {
    const fetchTransactions = vi.fn().mockRejectedValue(new Error('network down'))
    const fetchRefunds = vi.fn().mockResolvedValue([])

    render(<StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />)
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('network down')
  })

  describe('auto-poll', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('enables polling for both transactions and refunds when the auto-poll checkbox is checked', async () => {
      const fetchTransactions = vi.fn().mockResolvedValue([])
      const fetchRefunds = vi.fn().mockResolvedValue([])

      render(<StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />)

      fireEvent.click(screen.getByRole('checkbox', { name: /auto-poll/i }))

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(fetchTransactions).toHaveBeenCalled()
      expect(fetchRefunds).toHaveBeenCalled()
    })
  })
})
