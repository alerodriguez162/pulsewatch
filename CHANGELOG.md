# Changelog

## Unreleased

### Added

- Angular 22 client with lazy routes, Signals, reactive endpoint forms, Chart.js history, dark mode, and loading, empty, and error states.
- Node API that probes public HTTP endpoints, stores results and incidents in SQLite, and limits probe concurrency.
- SSRF checks for private, loopback, link-local, and metadata targets, with DNS answers rechecked before the connection is pinned.
- Unit tests for target rejection, incident transitions, uptime, and form conversion.
- Cypress foundation for dashboard rendering, empty and error states, URL validation, filtering, sorting, polled status changes, analytics, monitoring history, manual checks, settings, endpoint editing, deletion, and alert threshold saves.
- Alert rules can be filtered by name or URL, and each rule can run a server check immediately.
- Incident history can be limited to open or resolved incidents, and out-of-range alert thresholds are rejected before they are saved.
- The dashboard refresh interval can be set to 5, 10, or 30 seconds, and the header can refresh results without waiting for the next poll.

### Cypress backlog

These scenarios are not implemented and are not passing:

- real API integration, separate from the intercepted UI tests

## Milestones

- 2026-10-12 — Angular workspace and tooling.
- 2026-10-13 — Application shell and routing.
- 2026-10-14 — Endpoint management.
- 2026-10-15 — Backend probes and monitoring API.
- 2026-10-16 — Reactive monitoring state. Analytics, charts, and history.
- 2026-10-19 — Polling, incidents, and alerts. Feature completion and UI refinement.
- 2026-10-20 — Cypress setup, fixtures, and initial tests.
- 2026-10-21 — Cypress coverage continues. The core application is implemented. End-to-end coverage is still in progress.
