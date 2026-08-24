import type { LogEntry } from '../types'

interface ActivityLogProps {
  log: LogEntry[]
  onClear: () => void
}

export function ActivityLog({ log, onClear }: ActivityLogProps) {
  return (
    <section className="activity-log">
      <div className="activity-log__header">
        <h2>Activity Log</h2>
        <button type="button" onClick={onClear} disabled={log.length === 0}>
          Clear log
        </button>
      </div>
      {log.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <ul>
          {log.map((entry) => (
            <li key={entry.id} data-status={entry.status}>
              <details>
                <summary>
                  <span className="log-time">{entry.timestamp}</span>
                  <span className="log-endpoint">{entry.endpoint}</span>
                  <span className="log-status">{entry.status}</span>
                  <span className="log-duration">{entry.durationMs}ms</span>
                </summary>
                <pre>
                  {JSON.stringify({ request: entry.request, response: entry.response }, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
