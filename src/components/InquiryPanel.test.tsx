import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InquiryPanel } from './InquiryPanel'

describe('InquiryPanel', () => {
  it('submits the VA number and shows a payable summary on ACTIVE', async () => {
    const onInquiry = vi.fn().mockResolvedValue({ status: 'ACTIVE', vaAcctNo: 'VA123' })
    render(<InquiryPanel onInquiry={onInquiry} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    expect(onInquiry).toHaveBeenCalledWith({
      vaAcctNo: 'VA123',
      serviceId: undefined,
      masterAccount: undefined,
    })
    expect(await screen.findByTestId('inquiry-summary')).toHaveTextContent(/payable/i)
  })

  it('shows the QA-001 ambiguity note when the VA is not payable or unknown', async () => {
    const onInquiry = vi.fn().mockResolvedValue({ errorCode: 'QA-001' })
    render(<InquiryPanel onInquiry={onInquiry} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA999')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    const summary = await screen.findByTestId('inquiry-summary')
    expect(summary).toHaveTextContent(/QA-001/)
    expect(summary).toHaveTextContent(/can't tell which/i)
  })

  it('shows an error message when the inquiry call rejects', async () => {
    const onInquiry = vi.fn().mockRejectedValue(new Error('boom'))
    render(<InquiryPanel onInquiry={onInquiry} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
