import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  inquiry,
  payment,
  rawNotification,
  rawRefundStatus,
  listTransactions,
  listRefunds,
} from './client'

function mockFetchOnce(status: number, data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(data),
  }) as unknown as typeof fetch
}

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('inquiry posts to the public inquiry path with a JSON body', async () => {
    mockFetchOnce(200, { status: 'ACTIVE' })
    const result = await inquiry({ vaAcctNo: 'VA123' })
    expect(fetch).toHaveBeenCalledWith(
      '/mock/api/v1/public/simulate/tcb-va/inquiry',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaAcctNo: 'VA123' }),
      }),
    )
    expect(result).toEqual({ status: 200, data: { status: 'ACTIVE' } })
  })

  it('payment posts to the public payment path', async () => {
    mockFetchOnce(200, { result: 'NOTIFIED' })
    const result = await payment({ vaAcctNo: 'VA123', amount: 1000 })
    expect(fetch).toHaveBeenCalledWith(
      '/mock/api/v1/public/simulate/tcb-va/payment',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.data).toEqual({ result: 'NOTIFIED' })
  })

  it('rawNotification posts the body verbatim to the callback path', async () => {
    mockFetchOnce(200, { errorCode: '00' })
    const body = { NtfctnToRcv: { GrpHdr: { MsgId: 'QA-MSG-1' } } }
    const result = await rawNotification(body)
    expect(fetch).toHaveBeenCalledWith(
      '/mock/api/v1/public/simulate/tcb-va/callback',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    )
    expect(result.data).toEqual({ errorCode: '00' })
  })

  it('rawRefundStatus posts the body verbatim to the refund callback path', async () => {
    mockFetchOnce(200, { errorCode: '00' })
    const body = { txSts: [{ partId: 'REF-001', status: 'DENIED' }] }
    const result = await rawRefundStatus(body)
    expect(fetch).toHaveBeenCalledWith(
      '/mock/api/v1/public/simulate/tcb-va/callback/refund',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    )
    expect(result.data).toEqual({ errorCode: '00' })
  })

  it('listTransactions GETs the transactions path', async () => {
    mockFetchOnce(200, [])
    const result = await listTransactions()
    expect(fetch).toHaveBeenCalledWith('/mock/api/v1/public/simulate/tcb-va/transactions')
    expect(result.data).toEqual([])
  })

  it('listRefunds GETs the refunds path', async () => {
    mockFetchOnce(200, [])
    const result = await listRefunds()
    expect(fetch).toHaveBeenCalledWith('/mock/api/v1/public/simulate/tcb-va/refunds')
    expect(result.data).toEqual([])
  })
})
