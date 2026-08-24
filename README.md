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

## Docker

Production build served as a static SPA behind nginx, which reverse-proxies
`/mock/*` to `mocking-bird-ms` (the same job the Vite dev-proxy does), so no
CORS changes are ever needed on that service.

```bash
docker build -t va-bank-mocking .
docker run -p 8080:80 -e MOCK_BACKEND_URL=http://<your-mocking-bird-ms-host>:9500 va-bank-mocking
```

or with Compose (edit `MOCK_BACKEND_URL` in `docker-compose.yml` first):

```bash
docker compose up --build
```

Open `http://localhost:8080`. `MOCK_BACKEND_URL` is read at container
**start** (via nginx's env-template substitution), not baked into the JS
bundle — pointing at a different `mocking-bird-ms` instance never requires
rebuilding the image, only a different `-e MOCK_BACKEND_URL=...` (no
trailing slash).

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
