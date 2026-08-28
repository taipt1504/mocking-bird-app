import type {
  InquiryRequest,
  InquiryResponse,
  PaymentRequest,
  PaymentResponse,
  Transaction,
  Refund,
} from '../types'

const BASE = import.meta.env.VITE_MOCK_BASE ?? '/mock'

async function post<TReq, TRes>(
  path: string,
  body: TReq,
): Promise<{ status: number; data: TRes }> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as TRes
  return { status: res.status, data }
}

async function get<TRes>(path: string): Promise<{ status: number; data: TRes }> {
  const res = await fetch(`${BASE}${path}`)
  const data = (await res.json()) as TRes
  return { status: res.status, data }
}

export function inquiry(body: InquiryRequest) {
  return post<InquiryRequest, InquiryResponse>('/api/v1/public/simulate/tcb-va/inquiry', body)
}

export function payment(body: PaymentRequest) {
  return post<PaymentRequest, PaymentResponse>('/api/v1/public/simulate/tcb-va/payment', body)
}

/**
 * Passthrough endpoints: the body IS the document va-ms receives, so the caller owns every
 * field (several Itm, a repeated MsgId to force TN-001, an unknown VA for TN-003, or a
 * status/remark pair the scripted refund push never emits).
 */
export function rawNotification(body: unknown) {
  return post<unknown, unknown>('/api/v1/public/simulate/tcb-va/callback', body)
}

export function rawRefundStatus(body: unknown) {
  return post<unknown, unknown>('/api/v1/public/simulate/tcb-va/callback/refund', body)
}

export function listTransactions() {
  return get<Transaction[]>('/api/v1/public/simulate/tcb-va/transactions')
}

export function listRefunds() {
  return get<Refund[]>('/api/v1/public/simulate/tcb-va/refunds')
}
