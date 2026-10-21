# PulseWatch

PulseWatch is an API monitoring dashboard. The Angular client shows uptime, latency, status, and incidents. The Node API performs the HTTP probes and stores them in SQLite.

## Development

Requirements: Node.js 24 and npm 11.

```bash
npm install
npm run dev
```

The API listens on `http://localhost:3000`. The Angular app listens on `http://localhost:4200` and proxies `/api` to the API.

Copy `.env.example` if you want to change the port or database path:

- `PORT` — API port, default `3000`
- `PULSEWATCH_DB` — SQLite file, default `data/pulsewatch.sqlite` relative to the `server` package

The first launch seeds three public endpoints and no probe history. Metrics appear only after real checks. Private, loopback, link-local, and metadata targets are rejected.

## Scripts

- `npm run dev` — API and client together
- `npm test` — server and Angular unit tests
- `npm run lint` — ESLint for both packages
- `npm run build` — production build
- `npm run e2e -w client` — Cypress against the Angular dev server

## Architecture

- `client/src/app/features` — dashboard, endpoints, monitoring, analytics, alerts, and settings
- `client/src/app/core` — typed API client, signals store, and form rules
- `server/src` — Express API, SQLite, scheduler, and SSRF checks

The browser never probes third-party URLs. Signals hold the current view. RxJS polls `GET /api/dashboard` every 5 seconds and cancels a stale request when the next poll starts.

## Testing

Unit tests cover URL rejection, incident transitions, uptime math, and endpoint form conversion.

Cypress uses fixtures and `cy.intercept` for:

- dashboard rendering
- empty dashboard
- API error state
- endpoint URL validation
- filtering

Still to cover:

- editing an endpoint
- deleting an endpoint
- column sorting
- monitoring status changes
- alert threshold saves
- a separate run against the real API

Those scenarios are not counted as passing.

## Milestones

- October 12, 2026: Angular workspace and tooling
- October 13, 2026: application shell and routing
- October 14, 2026: endpoint management
- October 15, 2026: backend probes and monitoring API
- October 16, 2026: reactive monitoring state
- October 17, 2026: analytics, charts, and history
- October 18, 2026: polling, incidents, and alerts
- October 19, 2026: feature completion and UI refinement
- October 20, 2026: Cypress setup, fixtures, and initial tests
- October 21, 2026: continued Cypress coverage; the core application is in place and Cypress coverage is still in progress
