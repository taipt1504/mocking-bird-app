import { usePolling } from '../hooks/usePolling'
import type { Transaction, Refund } from '../types'

interface StateViewerProps {
  fetchTransactions: () => Promise<Transaction[]>
  fetchRefunds: () => Promise<Refund[]>
}

export function StateViewer({ fetchTransactions, fetchRefunds }: StateViewerProps) {
  const transactions = usePolling<Transaction[]>(fetchTransactions, 3000)
  const refunds = usePolling<Refund[]>(fetchRefunds, 3000)

  function toggleAutoPoll(checked: boolean) {
    transactions.setEnabled(checked)
    refunds.setEnabled(checked)
  }

  function refreshAll() {
    void transactions.refresh()
    void refunds.refresh()
  }

  return (
    <section className="state-viewer">
      <div className="state-viewer__controls">
        <h2>State</h2>
        <button type="button" onClick={refreshAll}>
          Refresh
        </button>
        <label>
          <input
            type="checkbox"
            checked={transactions.enabled}
            onChange={(e) => toggleAutoPoll(e.target.checked)}
          />
          Auto-poll every 3s
        </label>
      </div>

      <h3>Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>VA</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {(transactions.data ?? []).map((t) => (
            <tr key={t.id}>
              <td>{t.vaAcctNo}</td>
              <td>{t.amount}</td>
              <td>{t.status}</td>
              <td>{t.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Refunds</h3>
      <table>
        <thead>
          <tr>
            <th>Tx ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Remark</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {(refunds.data ?? []).map((r) => (
            <tr key={r.id}>
              <td>{r.txId}</td>
              <td>{r.amount}</td>
              <td>{r.status}</td>
              <td>{r.remark}</td>
              <td>{r.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
