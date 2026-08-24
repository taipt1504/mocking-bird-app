import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentPanel } from './PaymentPanel'

describe('PaymentPanel', () => {
  it('runs a single payment with the form values', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /^single payment$/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(1))
    expect(onPayment).toHaveBeenCalledWith(
      expect.objectContaining({ vaAcctNo: 'VA123', amount: 1000 }),
    )
  })

  it('runs two sequential payments for the double-payment preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /double payment/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(2))
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('fires N concurrent payments for the concurrent preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.clear(screen.getByLabelText('N'))
    await userEvent.type(screen.getByLabelText('N'), '3')
    await userEvent.click(screen.getByRole('button', { name: /concurrent payment/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(3))
  })

  it('overrides the amount for the amount-mismatch preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /amount mismatch/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(1))
    expect(onPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 1001 }))
  })

  it('overrides the VA number for the invalid-VA preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /invalid va/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(1))
    expect(onPayment).toHaveBeenCalledWith(
      expect.objectContaining({ vaAcctNo: 'VA-DOES-NOT-EXIST' }),
    )
  })
})
