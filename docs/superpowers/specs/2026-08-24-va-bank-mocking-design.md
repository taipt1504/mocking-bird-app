# VA Bank App Simulator — Design

Status: approved. Date: 2026-08-24.

## 1. Purpose

Build a standalone webapp that simulates a **bank app (TCB)** driving VA (virtual account)
payments against `va-ms`, using the existing `mocking-bird-ms` service as the mock TCB
backend. The webapp is a UI layer only — it does not reimplement any TCB wire/crypto logic,
it calls `mocking-bird-ms`'s already-existing plain-JSON simulate endpoints.

Primary users: QA/dev testing VA payment flows without Postman, covering single payment,
duplicate payment, concurrent/race payment, and error scenarios (amount mismatch, invalid VA).

Out of scope: refund initiation UI. A bank app never initiates a refund — `va-ms` decides to
refund and calls TCB internally; `mocking-bird-ms`'s refund/token endpoints are cluster-internal
and not reachable through the public gateway. The webapp only *observes* refund outcomes
(read-only) after they happen as a side effect of a payment scenario.

## 2. Reference flows (as-built, verified against current `va-ms` / `mocking-bird-ms` HEAD)

### 2.1 Inquiry (TCB → va-ms, §4.2.1)
- `mocking-bird-ms`: `POST /api/v1/public/simulate/tcb-va/inquiry`
  Body: `{vaAcctNo, serviceId?, masterAccount?, additionalInformation?}`
- Internally calls va-ms `POST /partner/api/va/tcb/inquiry` (signed/encrypted on the wire;
  irrelevant to this webapp, which only talks to `mocking-bird-ms`).
- Response: `{vaAcctNo, accountName, noOfVariableLayer, variableLayer1..4, status(ACTIVE|INACTIVE),
  serviceId, additionalInformation}` or business code `QA-001` (VA not found / not payable).
- **`QA-001` is deliberately ambiguous** (BR-VA-14): both "unknown VA" and "VA exists but is
  `PAID`/`EXPIRED`/`CANCELED`/`SUSPENDED`/`CLOSED`" answer identically, to avoid state disclosure.
  The UI must present this ambiguity, not claim "VA doesn't exist."
- Amount is omitted in the response for static VAs (no expected amount); dynamic VAs show it.

### 2.2 Payment notification (§4.2.2)
- `mocking-bird-ms`: `POST /api/v1/public/simulate/tcb-va/payment`
  Body: `{vaAcctNo, amount, senderAcct?, senderName?, narrative?, channel?, currency?, vaName?,
  inquiryFirst?}` (default `inquiryFirst=true`).
- Behavior: runs the inquiry leg first (unless disabled); if VA answers active, generates a
  fresh random `Itm.Id`/`EndToEndId`/`MsgId` and posts the TCB.CAMT.057 notification to va-ms;
  persists a `VaTransactionEntity` (`status: NOTIFIED|FAILED`). If inquiry is rejected, short-circuits
  with `result: "INQUIRY_REJECTED"` and never calls the payment endpoint.
- **Amount matching is exact-equal**, not tolerant — a payment amount that doesn't exactly match
  a dynamic VA's expected amount is treated as a mismatch by va-ms (see 2.3).
- va-ms dedupes on `(source, bank_txn_id)` — since the mock always generates a fresh `Itm.Id`
  per call, calling `/payment` twice always produces two distinct, non-replayed payments.

### 2.3 Multi-payment outcomes on one VA (core scenario matrix — va-ms's `VaCreditAdmission`)
| Scenario | va-ms outcome | Resulting `payment_status` |
|---|---|---|
| 1st payment, VA `NEW`, amount matches | `applyAndPay` | `PAID` (VA flips NEW→PAID) |
| 2nd+ payment (different txn id), VA already `PAID` | `doublePaid` | `REFUND_REQUIRED` → auto-refund dispatched |
| Payment on `CANCELED`/`EXPIRED` VA, or amount mismatch | `unapplied` (`UNAPPLIED_*`) | `REFUND_REQUIRED` → auto-refund dispatched |
| Byte-identical redelivery of same txn id | `Replayed` | no new row, no refund |

Refund dispatch (when triggered above) is async: va-ms → TCB refund-init call → TCB (mock)
accepts, then ~1.5s later (mock's default `refundStatusDelayMs`) pushes refund status back to
va-ms. The webapp observes this only via polling `GET /refunds`, never triggers it.

### 2.4 mocking-bird-ms read-only state endpoints
- `GET /api/v1/public/simulate/tcb-va/transactions` → `VaTransactionEntity[]`
  (`id, msgId, itemId, endToEndId, vaAcctNo, vaName, masterAcct, serviceId, amount, currency,
  senderAcct, senderName, narrative, channel, status(NOTIFIED|FAILED|REFUNDED), partnerErrorCode, createdAt`)
- `GET /api/v1/public/simulate/tcb-va/refunds` → `VaRefundEntity[]`
  (`id, txId, messageId, amount, fromAcct, toAcct, toAcctName, description, orgAccountingRef,
  channel, status(ACCEPTED|COMPLETED|REJECTED), remark(AUTH|NAUT), txnBnkId, createdAt`)

## 3. Architecture

- **React + Vite + TypeScript SPA. No custom backend.**
- Calls `mocking-bird-ms`'s public simulate endpoints directly from the browser.
- **CORS:** `mocking-bird-ms` has no CORS configuration today (verified — WebFlux, no
  `@CrossOrigin`/`CorsWebFilter`/security starter). Solved via **Vite dev-server proxy**
  (`vite.config.ts`: `/mock/*` → `http://localhost:9500`), so browser requests are same-origin
  in dev. Zero changes to the `mocking-bird-ms` repo. Base path configurable via
  `VITE_MOCK_BASE` env var. This only covers `npm run dev`; a static/preview build would need
  a small proxy added later if ever deployed — not needed for this local QA tool today.
- **State:** no Redux/Zustand. A single `useSimulator()` hook wraps `fetch` calls to the mock
  endpoints and appends every call to an activity-log array, persisted to `localStorage`.
- **Routing:** none needed — single page, panel-based layout (not multi-route), so log/state
  stay visible alongside whichever form is active.

## 4. Screens / UX

Single-page layout, three panels:

1. **Inquiry panel** — form: `vaAcctNo` (required), `serviceId`, `masterAccount`,
   `additionalInformation` (optional, collapsible). Submit → calls inquiry endpoint → renders
   raw JSON + a plain-language summary line (payable / not payable-or-unknown, with the BR-VA-14
   caveat shown inline).
2. **Payment panel** — form: `vaAcctNo`, `amount`, `senderAcct`, `senderName`, `narrative`,
   `channel`, `currency`, `inquiryFirst` toggle. Plus one-click scenario buttons that
   pre-fill/run the form:
   - **Single payment** — one call with amount = last inquiry's expected amount (or manual).
   - **Double payment** — fires the form twice sequentially against the same VA; log shows both
     results side by side, labeled 1st/2nd, with the outcome divergence explained.
   - **Concurrent (N-parallel)** — numeric input `N` (default 5) + "Fire" button, uses
     `Promise.all` to issue N payment calls simultaneously against one VA; results table shows
     per-call latency + outcome, highlighting the single `PAID` vs the rest `REFUND_REQUIRED`.
   - **Amount mismatch** — prefills an amount that doesn't equal the VA's expected amount.
   - **Invalid/inactive VA** — prefills a non-existent VA number.
3. **Activity Log** (always-visible side/bottom panel) — chronological list of every request/response
   this session: timestamp, endpoint, request body, response body/status, collapsible JSON.
   Persisted to `localStorage` so a page refresh doesn't lose history. Clear-log button.
4. **State Viewer** (read-only) — two tables from `GET /transactions` and `GET /refunds`.
   Manual refresh button + a toggle for 3s auto-polling (needed to catch the ~1.5s-delayed
   async refund push after a double-payment/mismatch scenario).

## 5. Error handling

- Network/HTTP errors from the mock surface directly in the Activity Log (status + body), not
  swallowed — this is a testing tool, raw errors are useful signal, not something to hide behind
  a generic message.
- No client-side validation beyond required-field checks (`vaAcctNo` required to submit) — the
  whole point is to be able to send edge-case/invalid payloads to see how the mock/va-ms react.

## 6. Testing plan

- No backend to unit-test (no custom server logic beyond the Vite proxy config).
- Manual verification against a running `mocking-bird-ms` (`./gradlew bootRun`, port 9500):
  1. Inquiry on a real dynamic VA → verify ACTIVE + amount shown.
  2. Inquiry on unknown VA number → verify QA-001 + ambiguity note shown.
  3. Single payment on a fresh VA → verify NOTIFIED, then State Viewer shows it, `PAID`.
  4. Double payment same VA → verify 2nd call's Activity Log entry differs, and State Viewer
     (after polling) shows a refund row appear.
  5. Concurrent N=5 payments on one fresh VA → verify exactly one `PAID`-path result, rest
     resolve to refund-required, no client-side crash from parallel fetches.
  6. Amount-mismatch payment → verify mismatch outcome + eventual refund row.
- Component-level tests (Vitest + React Testing Library) for the `useSimulator()` hook's
  request/log-append logic, mocking `fetch` — not for visual layout.

## 7. Open items deferred (explicitly not building now)

- No auth/login for the webapp itself (internal local tool).
- No environment switcher UI — single `.env`-configured target, per decision.
- No refund-trigger UI — refund is `va-ms`-internal, out of scope.
- No production deploy story (static hosting/proxy) — dev-only tool for now.
