import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RawCallbackPanel } from './RawCallbackPanel'

function renderPanel() {
  const onRawNotification = vi.fn().mockResolvedValue({ errorCode: '00' })
  const onRawRefundStatus = vi.fn().mockResolvedValue({ errorCode: '00' })
  render(
    <RawCallbackPanel
      onRawNotification={onRawNotification}
      onRawRefundStatus={onRawRefundStatus}
    />,
  )
  return { onRawNotification, onRawRefundStatus }
}

function editor() {
  return screen.getByLabelText(/request json/i) as HTMLTextAreaElement
}

describe('RawCallbackPanel', () => {
  it('builds a notification document carrying the per-item Id and EndToEndId', async () => {
    renderPanel()

    await userEvent.clear(screen.getByLabelText('MsgId'))
    await userEvent.type(screen.getByLabelText('MsgId'), 'QA-MSG-1')
    await userEvent.clear(screen.getAllByLabelText('Id')[0])
    await userEvent.type(screen.getAllByLabelText('Id')[0], 'QA-1')
    await userEvent.clear(screen.getAllByLabelText('EndToEndId')[0])
    await userEvent.type(screen.getAllByLabelText('EndToEndId')[0], 'FT-QA-1')
    await userEvent.type(screen.getAllByLabelText(/va number/i)[0], '7712398C01231')
    await userEvent.type(screen.getAllByLabelText(/amount/i)[0], '200000')

    await userEvent.click(screen.getByRole('button', { name: /build json/i }))

    expect(JSON.parse(editor().value)).toMatchObject({
      NtfctnToRcv: {
        GrpHdr: { MsgId: 'QA-MSG-1' },
        Ntfctn: {
          Itm: [
            {
              Id: 'QA-1',
              EndToEndId: 'FT-QA-1',
              Amt: { Value: 200000, Ccy: 'VND' },
              RltdAcct: { Id: { Othr: { Id: '7712398C01231' } } },
            },
          ],
        },
      },
    })
  })

  it('places sender account and sender name in Acct.Prxy.Id by position', async () => {
    renderPanel()

    await userEvent.clear(screen.getAllByLabelText(/sender account/i)[0])
    await userEvent.type(screen.getAllByLabelText(/sender account/i)[0], '19035979259245')
    await userEvent.clear(screen.getAllByLabelText(/sender name/i)[0])
    await userEvent.type(screen.getAllByLabelText(/sender name/i)[0], 'NGUYEN VAN A')

    await userEvent.click(screen.getByRole('button', { name: /build json/i }))

    // va-ms reads this array by index (SENDER_ACCOUNT = 0, SENDER_NAME = 1), so order matters.
    expect(JSON.parse(editor().value).NtfctnToRcv.Ntfctn.Itm[0].Acct.Prxy.Id).toEqual([
      '19035979259245',
      'NGUYEN VAN A',
    ])
  })

  it('places the master account in Acct.Id.Othr.Id, defaulting to the first suggestion', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: /build json/i }))
    expect(JSON.parse(editor().value).NtfctnToRcv.Ntfctn.Itm[0].Acct.Id).toEqual({
      Othr: { Id: '19034751711177' },
    })

    await userEvent.clear(screen.getAllByLabelText(/master account/i)[0])
    await userEvent.type(screen.getAllByLabelText(/master account/i)[0], '19000000000001')
    await userEvent.click(screen.getByRole('button', { name: /build json/i }))
    expect(JSON.parse(editor().value).NtfctnToRcv.Ntfctn.Itm[0].Acct.Id.Othr.Id).toBe(
      '19000000000001',
    )
  })

  it('omits Acct.Id when the master account is blank', async () => {
    renderPanel()

    await userEvent.clear(screen.getAllByLabelText(/master account/i)[0])
    await userEvent.click(screen.getByRole('button', { name: /build json/i }))

    expect(JSON.parse(editor().value).NtfctnToRcv.Ntfctn.Itm[0].Acct).not.toHaveProperty('Id')
  })

  it('keeps both sender slots when one is blank, so the positions never shift', async () => {
    renderPanel()

    await userEvent.clear(screen.getAllByLabelText(/sender account/i)[0])
    await userEvent.clear(screen.getAllByLabelText(/sender name/i)[0])
    await userEvent.type(screen.getAllByLabelText(/sender name/i)[0], 'NGUYEN VAN A')

    await userEvent.click(screen.getByRole('button', { name: /build json/i }))

    expect(JSON.parse(editor().value).NtfctnToRcv.Ntfctn.Itm[0].Acct.Prxy.Id).toEqual([
      '',
      'NGUYEN VAN A',
    ])
  })

  it('builds one Itm entry per added item, each with its own Id', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: /add itm/i }))
    await userEvent.click(screen.getByRole('button', { name: /build json/i }))

    const parsed = JSON.parse(editor().value)
    expect(parsed.NtfctnToRcv.Ntfctn.Itm).toHaveLength(2)
    expect(parsed.NtfctnToRcv.Ntfctn.Itm[0].Id).not.toBe(parsed.NtfctnToRcv.Ntfctn.Itm[1].Id)
  })

  it('sends the editor contents verbatim to the notification endpoint', async () => {
    const { onRawNotification } = renderPanel()

    await userEvent.clear(editor())
    await userEvent.type(editor(), '{{"hand":"written"}')
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() => expect(onRawNotification).toHaveBeenCalledWith({ hand: 'written' }))
  })

  it('reports invalid JSON and sends nothing', async () => {
    const { onRawNotification } = renderPanel()

    await userEvent.clear(editor())
    await userEvent.type(editor(), 'not json')
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/json/i)
    expect(onRawNotification).not.toHaveBeenCalled()
  })

  it('sends to the refund-status endpoint in refund mode, with the chosen status/remark', async () => {
    const { onRawRefundStatus, onRawNotification } = renderPanel()

    await userEvent.click(screen.getByRole('button', { name: /refund status/i }))
    await userEvent.clear(screen.getByLabelText(/tcb partner id/i))
    await userEvent.type(screen.getByLabelText(/tcb partner id/i), 'WINMONEY')
    await userEvent.clear(screen.getByLabelText('txId'))
    await userEvent.type(screen.getByLabelText('txId'), '005804899818053632')
    await userEvent.click(screen.getByRole('button', { name: /^denied$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() =>
      expect(onRawRefundStatus).toHaveBeenCalledWith({
        txSts: [
          expect.objectContaining({
            partId: 'WINMONEY.005804899818053632',
            status: 'DENIED',
            remark: 'DENIED',
          }),
        ],
      }),
    )
    expect(onRawNotification).not.toHaveBeenCalled()
  })

  it('sends a bare txId as partId when no partner id is given', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: /refund status/i }))
    await userEvent.clear(screen.getByLabelText(/tcb partner id/i))
    await userEvent.clear(screen.getByLabelText('txId'))
    await userEvent.type(screen.getByLabelText('txId'), '005804899818053632')
    await userEvent.click(screen.getByRole('button', { name: /build json/i }))

    expect(JSON.parse(editor().value).txSts[0].partId).toBe('005804899818053632')
  })
})
