# Changelog

## Unreleased

### Added

- Angular 22 client with lazy routes, Signals, reactive endpoint forms, Chart.js history, dark mode, and loading, empty, and error states.
- Node API that probes public HTTP endpoints, stores results and incidents in SQLite, and limits probe concurrency.
- SSRF checks for private, loopback, link-local, and metadata targets, with DNS answers rechecked before the connection is pinned.
- Unit tests for target rejection, incident transitions, uptime, and form conversion.
- Cypress foundation for dashboard rendering, empty and error states, URL validation, and filtering.

### Cypress backlog

These scenarios are not implemented and are not passing:

- endpoint editing
- endpoint deletion
- column sorting
- monitoring status changes
- alert configuration
- real API integration, separate from the intercepted UI tests

## Milestones

- 2026-10-12 — Angular workspace and tooling.
- 2026-10-13 — Application shell and routing.
- 2026-10-14 — Endpoint management.
- 2026-10-15 — Backend probes and monitoring API.
- 2026-10-16 — Reactive monitoring state.
- 2026-10-17 — Analytics, charts, and history.
- 2026-10-18 — Polling, incidents, and alerts.
- 2026-10-19 — Feature completion and UI refinement.
- 2026-10-20 — Cypress setup, fixtures, and initial tests.
- 2026-10-21 — Cypress coverage continues. The core application is implemented. End-to-end coverage is still in progress.
