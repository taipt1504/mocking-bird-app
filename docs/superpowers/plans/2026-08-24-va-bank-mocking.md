# VA Bank App Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React SPA that simulates a bank app (TCB) driving VA inquiry/payment scenarios against `mocking-bird-ms`, covering single/double/concurrent payment and error scenarios, with a persistent activity log and a read-only state viewer.

**Architecture:** Vite + React + TypeScript, no custom backend. A thin `api/client.ts` calls `mocking-bird-ms`'s public simulate endpoints through a Vite dev-server proxy (solves CORS with zero changes to `mocking-bird-ms`). A single `useSimulator()` hook wraps every call, appends to a `localStorage`-persisted activity log, and is consumed by four presentational components composed in `App.tsx`.

**Tech Stack:** React 18, TypeScript (strict), Vite 5, Vitest + React Testing Library + jsdom, no state-management library, no CSS framework, no router.

**Spec:** `docs/superpowers/specs/2026-08-24-va-bank-mocking-design.md`

## Global Constraints

- No custom backend — React + Vite + TypeScript SPA only, calls `mocking-bird-ms` directly.
- CORS solved via Vite dev-server proxy (`/mock/*` → `http://localhost:9500`); zero changes to the `mocking-bird-ms` repo.
- Base path configurable via `VITE_MOCK_BASE` env var (default `/mock`).
- Only the public gateway-style paths are called: `/api/v1/public/simulate/tcb-va/{inquiry,payment,transactions,refunds}`.
- No Redux/Zustand/React Query — a single `useSimulator()` hook + `localStorage`-persisted log.
- No routing — single-page, panel-based layout, log and state always visible.
- No refund-trigger UI — refund is `va-ms`-internal, out of scope.
- No auth/login for the webapp; no environment switcher UI.
- `QA-001` on inquiry is deliberately ambiguous (BR-VA-14) — UI text must not claim "VA doesn't exist," must state it could also be an already-settled VA.
- Amount matching on the backend is exact-equal, not tolerant — informs the "amount mismatch" scenario but is not enforced client-side.

---

## Task 1: Project scaffold + smoke test

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/index.css`
- Create: `src/setupTests.ts`
- Create: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `App` — default-exported React component, renders an `<h1>` with text "VA Bank App Simulator". Later tasks (Task 8) modify this component's body but must keep that heading.

- [ ] **Step 1: Create the project config files**

`package.json`:
```json
{
  "name": "va-bank-mocking",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/mock': {
        target: 'http://localhost:9500',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mock/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VA Bank App Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/setupTests.ts`:
```ts
import '@testing-library/jest-dom'
```

`src/index.css`:
```css
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 1rem;
}

.app__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

section {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 1rem;
}

form label {
  display: block;
  margin-bottom: 0.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  border-bottom: 1px solid #ddd;
  padding: 0.25rem 0.5rem;
}
```

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 2: Write the failing smoke test**

`src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the simulator heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /va bank app simulator/i, level: 1 }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm install && npm test`
Expected: FAIL — `src/App.tsx` does not exist yet (module not found).

- [ ] **Step 4: Write the minimal `App.tsx`**

`src/App.tsx`:
```tsx
function App() {
  return (
    <main>
      <h1>VA Bank App Simulator</h1>
    </main>
  )
}

export default App
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.tsx src/vite-env.d.ts src/index.css src/setupTests.ts src/App.tsx src/App.test.tsx package-lock.json
git commit -m "chore: scaffold Vite React TS project with smoke test"
```

---

## Task 2: Shared types + API client

**Files:**
- Create: `src/types.ts`
- Create: `src/api/client.ts`
- Test: `src/api/client.test.ts`

**Interfaces:**
- Produces (`src/types.ts`): `InquiryRequest`, `InquiryResponse`, `PaymentRequest`, `PaymentResponse`, `Transaction`, `Refund`, `LogEntry` — used by every later task.
- Produces (`src/api/client.ts`): `inquiry(body: InquiryRequest): Promise<{status: number; data: InquiryResponse}>`, `payment(body: PaymentRequest): Promise<{status: number; data: PaymentResponse}>`, `listTransactions(): Promise<{status: number; data: Transaction[]}>`, `listRefunds(): Promise<{status: number; data: Refund[]}>`.

- [ ] **Step 1: Write the failing test**

`src/api/client.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inquiry, payment, listTransactions, listRefunds } from './client'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/client.test.ts`
Expected: FAIL — `./client` module not found.

- [ ] **Step 3: Write the types and the client**

`src/types.ts`:
```ts
export interface InquiryRequest {
  vaAcctNo: string
  serviceId?: string
  masterAccount?: string
  additionalInformation?: { key: string; value: string }[]
}

export interface InquiryResponse {
  vaAcctNo?: string
  accountName?: string
  noOfVariableLayer?: number
  variableLayer1?: string | null
  variableLayer2?: string | null
  variableLayer3?: string | null
  variableLayer4?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  serviceId?: string
  additionalInformation?: { key: string; value: string }[]
  errorCode?: string
  errorMessage?: string
  amount?: number
}

export interface PaymentRequest {
  vaAcctNo: string
  amount: number
  senderAcct?: string
  senderName?: string
  narrative?: string
  channel?: string
  currency?: string
  vaName?: string
  inquiryFirst?: boolean
}

export interface PaymentResponse {
  result?: string
  errorCode?: string
  status?: string
  [key: string]: unknown
}

export interface Transaction {
  id: number
  msgId: string
  itemId: string
  endToEndId: string
  vaAcctNo: string
  vaName?: string
  masterAcct?: string
  serviceId?: string
  amount: number
  currency?: string
  senderAcct?: string
  senderName?: string
  narrative?: string
  channel?: string
  status: 'NOTIFIED' | 'FAILED' | 'REFUNDED'
  partnerErrorCode?: string
  createdAt: string
}

export interface Refund {
  id: number
  txId: string
  messageId?: string
  amount: number
  fromAcct?: string
  toAcct?: string
  toAcctName?: string
  description?: string
  orgAccountingRef?: string
  channel?: string
  status: 'ACCEPTED' | 'COMPLETED' | 'REJECTED'
  remark?: 'AUTH' | 'NAUT'
  txnBnkId?: string
  createdAt: string
}

export interface LogEntry {
  id: string
  timestamp: string
  endpoint: string
  request: unknown
  response: unknown
  status: number | 'error'
  durationMs: number
}
```

`src/api/client.ts`:
```ts
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

export function listTransactions() {
  return get<Transaction[]>('/api/v1/public/simulate/tcb-va/transactions')
}

export function listRefunds() {
  return get<Refund[]>('/api/v1/public/simulate/tcb-va/refunds')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/api/client.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/api/client.ts src/api/client.test.ts
git commit -m "feat: add shared types and mocking-bird-ms API client"
```

---

## Task 3: `useSimulator` hook

**Files:**
- Create: `src/hooks/useSimulator.ts`
- Test: `src/hooks/useSimulator.test.ts`

**Interfaces:**
- Consumes: `inquiry`, `payment`, `listTransactions`, `listRefunds` from `src/api/client.ts` (Task 2); `LogEntry`, `InquiryRequest`, `InquiryResponse`, `PaymentRequest`, `PaymentResponse`, `Transaction`, `Refund` from `src/types.ts` (Task 2).
- Produces: `useSimulator()` returning `{ log: LogEntry[]; clearLog: () => void; runInquiry: (body: InquiryRequest) => Promise<InquiryResponse>; runPayment: (body: PaymentRequest) => Promise<PaymentResponse>; fetchTransactions: () => Promise<Transaction[]>; fetchRefunds: () => Promise<Refund[]> }`. Used by `App.tsx` (Task 8) and consumed indirectly by every panel component (Tasks 5–7) via the props those functions get passed as.

- [ ] **Step 1: Write the failing test**

`src/hooks/useSimulator.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSimulator } from './useSimulator'
import * as api from '../api/client'

vi.mock('../api/client')

describe('useSimulator', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('appends a log entry on successful inquiry', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE' } })
    const { result } = renderHook(() => useSimulator())

    await act(async () => {
      await result.current.runInquiry({ vaAcctNo: 'VA123' })
    })

    expect(result.current.log).toHaveLength(1)
    expect(result.current.log[0]).toMatchObject({
      endpoint: 'inquiry',
      request: { vaAcctNo: 'VA123' },
      response: { status: 'ACTIVE' },
      status: 200,
    })
  })

  it('appends an error log entry and rethrows on failure', async () => {
    vi.mocked(api.payment).mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useSimulator())

    await expect(
      act(async () => {
        await result.current.runPayment({ vaAcctNo: 'VA123', amount: 1000 })
      }),
    ).rejects.toThrow('network down')

    expect(result.current.log[0]).toMatchObject({
      endpoint: 'payment',
      status: 'error',
      response: 'network down',
    })
  })

  it('persists the log to localStorage and reloads it on next mount', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE' } })
    const first = renderHook(() => useSimulator())
    await act(async () => {
      await first.result.current.runInquiry({ vaAcctNo: 'VA123' })
    })

    const second = renderHook(() => useSimulator())
    expect(second.result.current.log).toHaveLength(1)
  })

  it('clearLog empties the log', async () => {
    vi.mocked(api.inquiry).mockResolvedValue({ status: 200, data: { status: 'ACTIVE' } })
    const { result } = renderHook(() => useSimulator())
    await act(async () => {
      await result.current.runInquiry({ vaAcctNo: 'VA123' })
    })
    act(() => {
      result.current.clearLog()
    })
    expect(result.current.log).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useSimulator.test.ts`
Expected: FAIL — `./useSimulator` module not found.

- [ ] **Step 3: Implement the hook**

`src/hooks/useSimulator.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useSimulator.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSimulator.ts src/hooks/useSimulator.test.ts
git commit -m "feat: add useSimulator hook with persisted activity log"
```

---

## Task 4: `ActivityLog` component

**Files:**
- Create: `src/components/ActivityLog.tsx`
- Test: `src/components/ActivityLog.test.tsx`

**Interfaces:**
- Consumes: `LogEntry` from `src/types.ts` (Task 2).
- Produces: `ActivityLog({ log: LogEntry[]; onClear: () => void })` — a named-exported component. Used by `App.tsx` (Task 8), fed `log`/`clearLog` from `useSimulator()` (Task 3).

- [ ] **Step 1: Write the failing test**

`src/components/ActivityLog.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityLog } from './ActivityLog'
import type { LogEntry } from '../types'

const sampleEntry: LogEntry = {
  id: '1',
  timestamp: '2026-08-24T00:00:00.000Z',
  endpoint: 'inquiry',
  request: { vaAcctNo: 'VA123' },
  response: { status: 'ACTIVE' },
  status: 200,
  durationMs: 42,
}

describe('ActivityLog', () => {
  it('shows an empty state when there are no entries', () => {
    render(<ActivityLog log={[]} onClear={vi.fn()} />)
    expect(screen.getByText('No requests yet.')).toBeInTheDocument()
  })

  it('renders each log entry summary', () => {
    render(<ActivityLog log={[sampleEntry]} onClear={vi.fn()} />)
    expect(screen.getByText('inquiry')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('calls onClear when the clear button is clicked', async () => {
    const onClear = vi.fn()
    render(<ActivityLog log={[sampleEntry]} onClear={onClear} />)
    await userEvent.click(screen.getByRole('button', { name: /clear log/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ActivityLog.test.tsx`
Expected: FAIL — `./ActivityLog` module not found.

- [ ] **Step 3: Implement the component**

`src/components/ActivityLog.tsx`:
```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ActivityLog.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityLog.tsx src/components/ActivityLog.test.tsx
git commit -m "feat: add ActivityLog component"
```

---

## Task 5: `InquiryPanel` component

**Files:**
- Create: `src/components/InquiryPanel.tsx`
- Test: `src/components/InquiryPanel.test.tsx`

**Interfaces:**
- Consumes: `InquiryRequest`, `InquiryResponse` from `src/types.ts` (Task 2).
- Produces: `InquiryPanel({ onInquiry: (body: InquiryRequest) => Promise<InquiryResponse> })` — named export. `App.tsx` (Task 8) passes `runInquiry` from `useSimulator()` (Task 3) as `onInquiry`.

- [ ] **Step 1: Write the failing test**

`src/components/InquiryPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InquiryPanel } from './InquiryPanel'

describe('InquiryPanel', () => {
  it('submits the VA number and shows a payable summary on ACTIVE', async () => {
    const onInquiry = vi.fn().mockResolvedValue({ status: 'ACTIVE', vaAcctNo: 'VA123' })
    render(<InquiryPanel onInquiry={onInquiry} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    expect(onInquiry).toHaveBeenCalledWith({
      vaAcctNo: 'VA123',
      serviceId: undefined,
      masterAccount: undefined,
    })
    expect(await screen.findByTestId('inquiry-summary')).toHaveTextContent(/payable/i)
  })

  it('shows the QA-001 ambiguity note when the VA is not payable or unknown', async () => {
    const onInquiry = vi.fn().mockResolvedValue({ errorCode: 'QA-001' })
    render(<InquiryPanel onInquiry={onInquiry} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA999')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    const summary = await screen.findByTestId('inquiry-summary')
    expect(summary).toHaveTextContent(/QA-001/)
    expect(summary).toHaveTextContent(/can't tell which/i)
  })

  it('shows an error message when the inquiry call rejects', async () => {
    const onInquiry = vi.fn().mockRejectedValue(new Error('boom'))
    render(<InquiryPanel onInquiry={onInquiry} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.click(screen.getByRole('button', { name: /run inquiry/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/InquiryPanel.test.tsx`
Expected: FAIL — `./InquiryPanel` module not found.

- [ ] **Step 3: Implement the component**

`src/components/InquiryPanel.tsx`:
```tsx
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
        <p data-testid="inquiry-summary">{summarize(result)}</p>
      )}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  )
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/InquiryPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/InquiryPanel.tsx src/components/InquiryPanel.test.tsx
git commit -m "feat: add InquiryPanel with QA-001 ambiguity messaging"
```

---

## Task 6: `PaymentPanel` component (scenario presets)

**Files:**
- Create: `src/components/PaymentPanel.tsx`
- Test: `src/components/PaymentPanel.test.tsx`

**Interfaces:**
- Consumes: `PaymentRequest`, `PaymentResponse` from `src/types.ts` (Task 2).
- Produces: `PaymentPanel({ onPayment: (body: PaymentRequest) => Promise<PaymentResponse> })` — named export. `App.tsx` (Task 8) passes `runPayment` from `useSimulator()` (Task 3) as `onPayment`.

- [ ] **Step 1: Write the failing test**

`src/components/PaymentPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentPanel } from './PaymentPanel'

describe('PaymentPanel', () => {
  it('runs a single payment with the form values', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /^single payment$/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(1))
    expect(onPayment).toHaveBeenCalledWith(
      expect.objectContaining({ vaAcctNo: 'VA123', amount: 1000 }),
    )
  })

  it('runs two sequential payments for the double-payment preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /double payment/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(2))
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('fires N concurrent payments for the concurrent preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.clear(screen.getByLabelText('N'))
    await userEvent.type(screen.getByLabelText('N'), '3')
    await userEvent.click(screen.getByRole('button', { name: /concurrent payment/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(3))
  })

  it('overrides the amount for the amount-mismatch preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/va number/i), 'VA123')
    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /amount mismatch/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(1))
    expect(onPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 1001 }))
  })

  it('overrides the VA number for the invalid-VA preset', async () => {
    const onPayment = vi.fn().mockResolvedValue({ result: 'NOTIFIED' })
    render(<PaymentPanel onPayment={onPayment} />)

    await userEvent.type(screen.getByLabelText(/amount/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /invalid va/i }))

    await waitFor(() => expect(onPayment).toHaveBeenCalledTimes(1))
    expect(onPayment).toHaveBeenCalledWith(
      expect.objectContaining({ vaAcctNo: 'VA-DOES-NOT-EXIST' }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/PaymentPanel.test.tsx`
Expected: FAIL — `./PaymentPanel` module not found.

- [ ] **Step 3: Implement the component**

`src/components/PaymentPanel.tsx`:
```tsx
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
    const calls = Array.from({ length: concurrency }, (_, index) => runOne(index, request))
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
          <input value={vaAcctNo} onChange={(e) => setVaAcctNo(e.target.value)} required />
        </label>
        <label>
          Amount
          <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
                <td>{r.error ? `Error: ${r.error}` : JSON.stringify(r.response)}</td>
                <td>{Math.round(r.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/PaymentPanel.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/PaymentPanel.tsx src/components/PaymentPanel.test.tsx
git commit -m "feat: add PaymentPanel with single/double/concurrent/mismatch/invalid-VA presets"
```

---

## Task 7: `usePolling` hook + `StateViewer` component

**Files:**
- Create: `src/hooks/usePolling.ts`
- Test: `src/hooks/usePolling.test.ts`
- Create: `src/components/StateViewer.tsx`
- Test: `src/components/StateViewer.test.tsx`

**Interfaces:**
- Produces (`usePolling`): `usePolling<T>(fetcher: () => Promise<T>, intervalMs?: number)` returning `{ data: T | null; refresh: () => Promise<void>; enabled: boolean; setEnabled: (enabled: boolean) => void }`.
- Consumes (`StateViewer`): `usePolling` above; `Transaction`, `Refund` from `src/types.ts` (Task 2).
- Produces (`StateViewer`): `StateViewer({ fetchTransactions: () => Promise<Transaction[]>; fetchRefunds: () => Promise<Refund[]> })` — named export. `App.tsx` (Task 8) passes `fetchTransactions`/`fetchRefunds` from `useSimulator()` (Task 3).

- [ ] **Step 1: Write the failing test for `usePolling`**

`src/hooks/usePolling.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePolling } from './usePolling'

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not poll automatically until enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    renderHook(() => usePolling(fetcher, 1000))

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(fetcher).not.toHaveBeenCalled()
  })

  it('polls on the interval once enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = renderHook(() => usePolling(fetcher, 1000))

    act(() => {
      result.current.setEnabled(true)
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('refresh() fetches immediately regardless of enabled state', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = renderHook(() => usePolling(fetcher, 1000))

    await act(async () => {
      await result.current.refresh()
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/usePolling.test.ts`
Expected: FAIL — `./usePolling` module not found.

- [ ] **Step 3: Implement `usePolling`**

`src/hooks/usePolling.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 3000) {
  const [data, setData] = useState<T | null>(null)
  const [enabled, setEnabled] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    const result = await fetcherRef.current()
    setData(result)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      void refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs, refresh])

  return { data, refresh, enabled, setEnabled }
}
```

- [ ] **Step 4: Run test to verify `usePolling` passes**

Run: `npm test -- src/hooks/usePolling.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `StateViewer`**

`src/components/StateViewer.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StateViewer } from './StateViewer'

describe('StateViewer', () => {
  it('renders transactions and refunds after clicking Refresh', async () => {
    const fetchTransactions = vi.fn().mockResolvedValue([
      {
        id: 1,
        msgId: 'm',
        itemId: 'i',
        endToEndId: 'e',
        vaAcctNo: 'VA123',
        amount: 1000,
        status: 'NOTIFIED',
        createdAt: '2026-08-24',
      },
    ])
    const fetchRefunds = vi.fn().mockResolvedValue([
      { id: 1, txId: 'TX1', amount: 1000, status: 'COMPLETED', remark: 'AUTH', createdAt: '2026-08-24' },
    ])

    render(<StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />)
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(await screen.findByText('VA123')).toBeInTheDocument()
    expect(await screen.findByText('TX1')).toBeInTheDocument()
  })

  it('does not fetch automatically until the auto-poll toggle is checked', () => {
    const fetchTransactions = vi.fn().mockResolvedValue([])
    const fetchRefunds = vi.fn().mockResolvedValue([])

    render(<StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />)

    expect(fetchTransactions).not.toHaveBeenCalled()
    expect(fetchRefunds).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- src/components/StateViewer.test.tsx`
Expected: FAIL — `./StateViewer` module not found.

- [ ] **Step 7: Implement `StateViewer`**

`src/components/StateViewer.tsx`:
```tsx
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
```

- [ ] **Step 8: Run test to verify `StateViewer` passes**

Run: `npm test -- src/components/StateViewer.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add src/hooks/usePolling.ts src/hooks/usePolling.test.ts src/components/StateViewer.tsx src/components/StateViewer.test.tsx
git commit -m "feat: add usePolling hook and read-only StateViewer"
```

---

## Task 8: Wire `App.tsx`, dev env, and docs

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Create: `.env.example`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Consumes: `useSimulator` (Task 3), `InquiryPanel` (Task 5), `PaymentPanel` (Task 6), `ActivityLog` (Task 4), `StateViewer` (Task 7).

- [ ] **Step 1: Extend the failing test**

Add to `src/App.test.tsx` (keep the existing heading test):
```tsx
it('renders all four panels', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /^inquiry$/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /^payment$/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /^state$/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /activity log/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — the current `App.tsx` stub renders only the top-level heading.

- [ ] **Step 3: Wire the full `App.tsx`**

`src/App.tsx`:
```tsx
import { useSimulator } from './hooks/useSimulator'
import { InquiryPanel } from './components/InquiryPanel'
import { PaymentPanel } from './components/PaymentPanel'
import { ActivityLog } from './components/ActivityLog'
import { StateViewer } from './components/StateViewer'

function App() {
  const { log, clearLog, runInquiry, runPayment, fetchTransactions, fetchRefunds } =
    useSimulator()

  return (
    <main className="app">
      <h1>VA Bank App Simulator</h1>
      <div className="app__grid">
        <InquiryPanel onInquiry={runInquiry} />
        <PaymentPanel onPayment={runPayment} />
        <StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />
      </div>
      <ActivityLog log={log} onClear={clearLog} />
    </main>
  )
}

export default App
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — full suite green (all tasks' tests included).

- [ ] **Step 5: Add dev/env files**

`.env.example`:
```
VITE_MOCK_BASE=/mock
```

`.gitignore`:
```
node_modules
dist
.env
```

`README.md`:
```markdown
# VA Bank App Simulator

Simulates a bank app (TCB) driving VA inquiry/payment scenarios against
`mocking-bird-ms`'s `/api/v1/public/simulate/tcb-va/*` endpoints.

## Prerequisites

- `mocking-bird-ms` running locally on port 9500 (`./gradlew bootRun` in that repo).

## Setup

```bash
npm install
cp .env.example .env   # optional, defaults already match
npm run dev
```

Open the printed local URL. Requests to `/mock/*` are proxied to
`http://localhost:9500` by the Vite dev server (see `vite.config.ts`) —
this avoids mocking-bird-ms's lack of CORS configuration without
modifying that service.

## Tests

```bash
npm test
```

## Manual verification checklist (run against a live mocking-bird-ms)

1. Inquiry on a real dynamic VA → expect ACTIVE + amount shown.
2. Inquiry on an unknown VA number → expect the QA-001 ambiguity note.
3. Single payment on a fresh VA → expect NOTIFIED, then the State panel
   (after Refresh) shows it.
4. Double payment on the same VA → expect the second row's outcome to
   differ from the first, and — after a few seconds with auto-poll on —
   a refund row to appear in the State panel.
5. Concurrent payment with N=5 on one fresh VA → expect exactly one
   `PAID`-path outcome and the rest to resolve as refund-required, with
   no client-side errors from the parallel requests.
6. Amount-mismatch payment → expect a mismatch outcome and an eventual
   refund row.
```

- [ ] **Step 6: Run the full test suite as a final gate**

Run: `npm test`
Expected: PASS — every test file from Tasks 1–8 green.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx .env.example .gitignore README.md
git commit -m "feat: wire panels into App and document dev setup"
```
