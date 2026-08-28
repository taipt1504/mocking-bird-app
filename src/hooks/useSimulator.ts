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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
    } catch {
      // storage can be full or unavailable (e.g. private browsing) — the log is a convenience, not critical state
    }
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

  const runRawNotification = useCallback(
    (body: unknown) =>
      record<unknown, unknown>('callback', body, () => api.rawNotification(body)),
    [record],
  )

  const runRawRefundStatus = useCallback(
    (body: unknown) =>
      record<unknown, unknown>('callback/refund', body, () => api.rawRefundStatus(body)),
    [record],
  )

  const fetchTransactions = useCallback(async () => {
    const { data } = await api.listTransactions()
    return data
  }, [])

  const fetchRefunds = useCallback(async () => {
    const { data } = await api.listRefunds()
    return data
  }, [])

  return {
    log,
    clearLog,
    runInquiry,
    runPayment,
    runRawNotification,
    runRawRefundStatus,
    fetchTransactions,
    fetchRefunds,
  }
}
