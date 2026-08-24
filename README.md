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
