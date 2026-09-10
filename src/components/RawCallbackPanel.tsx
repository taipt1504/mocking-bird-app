import { useState } from 'react'

interface RawCallbackPanelProps {
  onRawNotification: (body: unknown) => Promise<unknown>
  onRawRefundStatus: (body: unknown) => Promise<unknown>
}

type Mode = 'notification' | 'refund'

interface ItemFields {
  id: string
  endToEndId: string
  vaAcctNo: string
  amount: string
  currency: string
  senderAcct: string
  senderName: string
}

interface RefundFields {
  partId: string
  channel: string
  status: string
  remark: string
  txnDate: string
}

const UNKNOWN_VA_NUMBER = 'VA-DOES-NOT-EXIST'

// status/remark pairs the scripted refund push never emits on its own.
const REFUND_PRESETS: { label: string; status: string; remark: string }[] = [
  { label: 'COMPLETED/AUTH', status: 'COMPLETED', remark: 'AUTH' },
  { label: 'COMPLETED/NAUT', status: 'COMPLETED', remark: 'NAUT' },
  { label: 'DENIED', status: 'DENIED', remark: 'DENIED' },
  { label: 'REJECTED/NAK', status: 'REJECTED', remark: 'NAK' },
]

function newItem(n: number): ItemFields {
  return {
    id: `QA-${n}`,
    endToEndId: `FT-QA-${n}`,
    vaAcctNo: '',
    amount: '',
    currency: 'VND',
    senderAcct: '19035979259245',
    senderName: 'NGUYEN VAN A',
  }
}

function buildNotification(msgId: string, creDtTm: string, items: ItemFields[]) {
  return {
    NtfctnToRcv: {
      GrpHdr: { MsgId: msgId, CreDtTm: creDtTm },
      Ntfctn: {
        Itm: items.map((item) => ({
          Id: item.id,
          EndToEndId: item.endToEndId,
          // va-ms reads this array by position: [0] sender account, [1] sender name. Both slots
          // are always emitted, blank included, so an empty account never shifts the name into it.
          Acct: { Prxy: { Id: [item.senderAcct, item.senderName] } },
          Amt: { Value: Number(item.amount), Ccy: item.currency },
          RltdAcct: { Id: { Othr: { Id: item.vaAcctNo } } },
        })),
      },
    },
  }
}

function buildRefund(fields: RefundFields) {
  return {
    txSts: [
      {
        partId: fields.partId,
        channel: fields.channel,
        status: fields.status,
        remark: fields.remark,
        txnDate: fields.txnDate,
      },
    ],
  }
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function RawCallbackPanel({
  onRawNotification,
  onRawRefundStatus,
}: RawCallbackPanelProps) {
  const [mode, setMode] = useState<Mode>('notification')
  const [msgId, setMsgId] = useState('QA-MSG-1')
  const [items, setItems] = useState<ItemFields[]>([newItem(1)])
  const [refund, setRefund] = useState<RefundFields>({
    partId: 'REF-001',
    channel: 'CITAD',
    status: 'COMPLETED',
    remark: 'AUTH',
    txnDate: new Date().toISOString().slice(0, 10),
  })
  const [json, setJson] = useState(() =>
    pretty(buildNotification('QA-MSG-1', new Date().toISOString().slice(0, 19), [newItem(1)])),
  )
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<unknown>(null)

  function updateItem(index: number, patch: Partial<ItemFields>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function buildJson(overrides: { items?: ItemFields[]; refund?: RefundFields } = {}) {
    const built =
      mode === 'notification'
        ? buildNotification(msgId, new Date().toISOString().slice(0, 19), overrides.items ?? items)
        : buildRefund(overrides.refund ?? refund)
    setJson(pretty(built))
    setError(null)
  }

  function applyRefundPreset(preset: { status: string; remark: string }) {
    const next = { ...refund, status: preset.status, remark: preset.remark }
    setRefund(next)
    buildJson({ refund: next })
  }

  function applyUnknownVa() {
    const next = items.map((item, i) =>
      i === 0 ? { ...item, vaAcctNo: UNKNOWN_VA_NUMBER } : item,
    )
    setItems(next)
    buildJson({ items: next })
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setResponse(null)
    setJson(
      pretty(
        next === 'notification'
          ? buildNotification(msgId, new Date().toISOString().slice(0, 19), items)
          : buildRefund(refund),
      ),
    )
  }

  async function send() {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch (err) {
      setResponse(null)
      setError(`Invalid JSON — nothing was sent. ${err instanceof Error ? err.message : ''}`)
      return
    }
    setError(null)
    try {
      const result =
        mode === 'notification' ? await onRawNotification(parsed) : await onRawRefundStatus(parsed)
      setResponse(result)
    } catch (err) {
      setResponse(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="raw-callback">
      <h2>Raw Callback</h2>
      <p className="raw-callback__hint">
        Passthrough — the body below is exactly what va-ms receives, so every field is yours.
        Sending the same MsgId twice forces TN-001; an unknown VA forces TN-003.
      </p>

      <div className="raw-callback__modes">
        <button
          type="button"
          aria-pressed={mode === 'notification'}
          onClick={() => switchMode('notification')}
        >
          Payment notification (4.2.2)
        </button>
        <button
          type="button"
          aria-pressed={mode === 'refund'}
          onClick={() => switchMode('refund')}
        >
          Refund status (4.2.3.3)
        </button>
      </div>

      {mode === 'notification' ? (
        <div className="raw-callback__fields">
          <label>
            MsgId
            <input value={msgId} onChange={(e) => setMsgId(e.target.value)} />
          </label>

          {items.map((item, index) => (
            <fieldset key={index}>
              <legend>Itm {index + 1}</legend>
              <label>
                Id
                <input
                  value={item.id}
                  onChange={(e) => updateItem(index, { id: e.target.value })}
                />
              </label>
              <label>
                EndToEndId
                <input
                  value={item.endToEndId}
                  onChange={(e) => updateItem(index, { endToEndId: e.target.value })}
                />
              </label>
              <label>
                VA number
                <input
                  value={item.vaAcctNo}
                  onChange={(e) => updateItem(index, { vaAcctNo: e.target.value })}
                />
              </label>
              <label>
                Amount
                <input
                  value={item.amount}
                  onChange={(e) => updateItem(index, { amount: e.target.value })}
                />
              </label>
              <label>
                Currency
                <input
                  value={item.currency}
                  onChange={(e) => updateItem(index, { currency: e.target.value })}
                />
              </label>
              <label>
                Sender account
                <input
                  value={item.senderAcct}
                  onChange={(e) => updateItem(index, { senderAcct: e.target.value })}
                />
              </label>
              <label>
                Sender name
                <input
                  value={item.senderName}
                  onChange={(e) => updateItem(index, { senderName: e.target.value })}
                />
              </label>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove Itm {index + 1}
                </button>
              )}
            </fieldset>
          ))}

          <div className="raw-callback__actions">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newItem(prev.length + 1)])}
            >
              Add Itm
            </button>
            <button type="button" onClick={applyUnknownVa}>
              Unknown VA (TN-003)
            </button>
          </div>
        </div>
      ) : (
        <div className="raw-callback__fields">
          <label>
            partId
            <input
              value={refund.partId}
              onChange={(e) => setRefund({ ...refund, partId: e.target.value })}
            />
          </label>
          <label>
            channel
            <input
              value={refund.channel}
              onChange={(e) => setRefund({ ...refund, channel: e.target.value })}
            />
          </label>
          <label>
            status
            <input
              value={refund.status}
              onChange={(e) => setRefund({ ...refund, status: e.target.value })}
            />
          </label>
          <label>
            remark
            <input
              value={refund.remark}
              onChange={(e) => setRefund({ ...refund, remark: e.target.value })}
            />
          </label>
          <label>
            txnDate
            <input
              value={refund.txnDate}
              onChange={(e) => setRefund({ ...refund, txnDate: e.target.value })}
            />
          </label>

          <div className="raw-callback__actions">
            {REFUND_PRESETS.map((preset) => (
              <button key={preset.label} type="button" onClick={() => applyRefundPreset(preset)}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="raw-callback__actions">
        <button type="button" onClick={() => buildJson()}>
          Build JSON
        </button>
      </div>

      <label className="raw-callback__editor">
        Request JSON
        <textarea rows={14} value={json} onChange={(e) => setJson(e.target.value)} />
      </label>

      <div className="raw-callback__actions">
        <button type="button" onClick={() => void send()}>
          Send
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
      {response !== null && <pre>{pretty(response)}</pre>}
    </section>
  )
}
