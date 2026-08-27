import { useState, type FormEvent } from 'react'
import type { PaymentRequest, PaymentResponse } from '../types'

interface PaymentPanelProps {
  onPayment: (body: PaymentRequest) => Promise<PaymentResponse>
}

interface BatchResult {
  index: number
  request: PaymentRequest
  response?: PaymentResponse
  error?: string
  durationMs: number
}

const INVALID_VA_NUMBER = 'VA-DOES-NOT-EXIST'

export function PaymentPanel({ onPayment }: PaymentPanelProps) {
  const [vaAcctNo, setVaAcctNo] = useState('')
  const [amount, setAmount] = useState('')
  const [senderAcct, setSenderAcct] = useState('')
  const [senderName, setSenderName] = useState('')
  const [narrative, setNarrative] = useState('')
  const [channel, setChannel] = useState('')
  const [currency, setCurrency] = useState('')
  const [inquiryFirst, setInquiryFirst] = useState(true)
  const [concurrency, setConcurrency] = useState(5)
  const [results, setResults] = useState<BatchResult[]>([])

  function buildRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
    return {
      vaAcctNo,
      amount: Number(amount),
      senderAcct: senderAcct || undefined,
      senderName: senderName || undefined,
      narrative: narrative || undefined,
      channel: channel || undefined,
      currency: currency || undefined,
      inquiryFirst,
      ...overrides,
    }
  }

  async function runOne(index: number, request: PaymentRequest): Promise<BatchResult> {
    const start = performance.now()
    try {
      const response = await onPayment(request)
      return { index, request, response, durationMs: performance.now() - start }
    } catch (err) {
      return {
        index,
        request,
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - start,
      }
    }
  }

  async function runSingle(overrides: Partial<PaymentRequest> = {}) {
    const request = buildRequest(overrides)
    setResults([await runOne(0, request)])
  }

  async function runDouble() {
    const request = buildRequest()
    const first = await runOne(0, request)
    const second = await runOne(1, request)
    setResults([first, second])
  }

  async function runConcurrent() {
    const request = buildRequest()
    const count = Math.max(1, concurrency)
    const calls = Array.from({ length: count }, (_, index) => runOne(index, request))
    setResults(await Promise.all(calls))
  }

  function runAmountMismatch() {
    const decoy = amount ? String(Number(amount) + 1) : '999999'
    setAmount(decoy)
    void runSingle({ amount: Number(decoy) })
  }

  function runInvalidVa() {
    setVaAcctNo(INVALID_VA_NUMBER)
    void runSingle({ vaAcctNo: INVALID_VA_NUMBER })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void runSingle()
  }

  return (
    <section className="payment-panel">
      <h2>Payment</h2>
      <form onSubmit={handleSubmit}>
        <label>
          VA number
          <input value={vaAcctNo} onChange={(e) => setVaAcctNo(e.target.value)} />
        </label>
        <label>
          Amount
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Sender account
          <input value={senderAcct} onChange={(e) => setSenderAcct(e.target.value)} />
        </label>
        <label>
          Sender name
          <input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
        </label>
        <label>
          Narrative
          <input value={narrative} onChange={(e) => setNarrative(e.target.value)} />
        </label>
        <label>
          Channel
          <input value={channel} onChange={(e) => setChannel(e.target.value)} />
        </label>
        <label>
          Currency
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={inquiryFirst}
            onChange={(e) => setInquiryFirst(e.target.checked)}
          />
          Inquiry first
        </label>
        <button type="submit">Single payment</button>
      </form>

      <div className="payment-panel__scenarios">
        <span className="payment-panel__scenarios-label">Scenarios</span>
        <button type="button" onClick={() => void runDouble()}>
          Double payment
        </button>
        <label>
          N
          <input
            type="number"
            min={1}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
          />
        </label>
        <button type="button" onClick={() => void runConcurrent()}>
          Concurrent payment
        </button>
        <button type="button" onClick={runAmountMismatch}>
          Amount mismatch
        </button>
        <button type="button" onClick={runInvalidVa}>
          Invalid VA
        </button>
      </div>

      {results.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Outcome</th>
                <th>Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.index}>
                  <td>{r.index + 1}</td>
                  <td data-outcome={r.error ? 'error' : 'ok'}>
                    {r.error ? `Error: ${r.error}` : JSON.stringify(r.response)}
                  </td>
                  <td>{Math.round(r.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
