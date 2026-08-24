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
                  <span>{entry.timestamp}</span> <span>{entry.endpoint}</span>{' '}
                  <span>{entry.status}</span> <span>{entry.durationMs}ms</span>
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
