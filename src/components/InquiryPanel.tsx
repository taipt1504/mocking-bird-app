import { useState, type FormEvent } from 'react'
import type { InquiryRequest, InquiryResponse } from '../types'

interface InquiryPanelProps {
  onInquiry: (body: InquiryRequest) => Promise<InquiryResponse>
}

export function InquiryPanel({ onInquiry }: InquiryPanelProps) {
  const [vaAcctNo, setVaAcctNo] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [masterAccount, setMasterAccount] = useState('')
  const [result, setResult] = useState<InquiryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const response = await onInquiry({
        vaAcctNo,
        serviceId: serviceId || undefined,
        masterAccount: masterAccount || undefined,
      })
      setResult(response)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="inquiry-panel">
      <h2>Inquiry</h2>
      <form onSubmit={handleSubmit}>
        <label>
          VA number
          <input value={vaAcctNo} onChange={(e) => setVaAcctNo(e.target.value)} required />
        </label>
        <label>
          Service ID
          <input value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
        </label>
        <label>
          Master account
          <input value={masterAccount} onChange={(e) => setMasterAccount(e.target.value)} />
        </label>
        <button type="submit">Run inquiry</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <p data-testid="inquiry-summary" className={`callout callout--${summaryTone(result)}`}>
          {summarize(result)}
        </p>
      )}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  )
}

function summaryTone(result: InquiryResponse): 'success' | 'warning' {
  return result.status === 'ACTIVE' ? 'success' : 'warning'
}

function summarize(result: InquiryResponse): string {
  if (result.status === 'ACTIVE') {
    return 'Payable — VA is ACTIVE.'
  }
  if (result.errorCode === 'QA-001' || result.status === 'INACTIVE') {
    return (
      "Not payable or unknown (QA-001). This covers BOTH an unknown VA number AND a VA " +
      "that already exists but is PAID/EXPIRED/CANCELED/SUSPENDED/CLOSED — inquiry alone can't tell which."
    )
  }
  return `Unrecognized response: ${JSON.stringify(result)}`
}
