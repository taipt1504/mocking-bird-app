import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/client'
import type {
  InquiryRequest,
  InquiryResponse,
  PaymentRequest,
  PaymentResponse,
  Transaction,
  Refund,
  LogEntry,
} from '../types'

const STORAGE_KEY = 'va-bank-mocking:activity-log'
const MAX_LOG_ENTRIES = 200

function loadLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LogEntry[]) : []
  } catch {
    return []
  }
}

let logIdCounter = 0
function nextLogId(): string {
  logIdCounter += 1
  return `${Date.now()}-${logIdCounter}`
}

export function useSimulator() {
  const [log, setLog] = useState<LogEntry[]>(() => loadLog())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  }, [log])

  const appendLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES))
  }, [])

  const clearLog = useCallback(() => {
    setLog([])
  }, [])

  const record = useCallback(
    async <TReq, TRes>(
      endpoint: string,
      request: TReq,
      call: () => Promise<{ status: number; data: TRes }>,
    ): Promise<TRes> => {
      const start = Date.now()
      try {
        const { status, data } = await call()
        appendLog({
          id: nextLogId(),
          timestamp: new Date().toISOString(),
          endpoint,
          request,
          response: data,
          status,
          durationMs: Date.now() - start,
        })
        return data
      } catch (err) {
        appendLog({
          id: nextLogId(),
          timestamp: new Date().toISOString(),
          endpoint,
          request,
          response: err instanceof Error ? err.message : String(err),
          status: 'error',
          durationMs: Date.now() - start,
        })
        throw err
      }
    },
    [appendLog],
  )

  const runInquiry = useCallback(
    (body: InquiryRequest) =>
      record<InquiryRequest, InquiryResponse>('inquiry', body, () => api.inquiry(body)),
    [record],
  )

  const runPayment = useCallback(
    (body: PaymentRequest) =>
      record<PaymentRequest, PaymentResponse>('payment', body, () => api.payment(body)),
    [record],
  )

  const fetchTransactions = useCallback(
    () =>
      record<undefined, Transaction[]>('transactions', undefined, () => api.listTransactions()),
    [record],
  )

  const fetchRefunds = useCallback(
    () => record<undefined, Refund[]>('refunds', undefined, () => api.listRefunds()),
    [record],
  )

  return { log, clearLog, runInquiry, runPayment, fetchTransactions, fetchRefunds }
}
