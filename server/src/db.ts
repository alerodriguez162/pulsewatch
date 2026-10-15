import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

import { decideIncidents, incidentMessage } from './incidents.js';
import { averageLatency, uptimePercent } from './uptime.js';
import type {
  EndpointDraft,
  EndpointRecord,
  EndpointSummary,
  ErrorCategory,
  HttpMethod,
  IncidentKind,
  IncidentRecord,
  ProbeObservation,
  ProbeResultRecord,
} from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

interface EndpointRow {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  timeout_ms: number;
  interval_ms: number;
  expected_status: number | null;
  latency_threshold_ms: number;
  failure_threshold: number;
  enabled: number;
  consecutive_failures: number;
  next_check_at: string;
  created_at: string;
  updated_at: string;
}

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      timeout_ms INTEGER NOT NULL,
      interval_ms INTEGER NOT NULL,
      expected_status INTEGER,
      latency_threshold_ms INTEGER NOT NULL,
      failure_threshold INTEGER NOT NULL,
      enabled INTEGER NOT NULL,
      consecutive_failures INTEGER NOT NULL,
      next_check_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS probe_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      status_code INTEGER,
      latency_ms INTEGER NOT NULL,
      success INTEGER NOT NULL,
      error_category TEXT,
      FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      message TEXT NOT NULL,
      FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_probe_endpoint_time ON probe_results(endpoint_id, checked_at);
    CREATE INDEX IF NOT EXISTS idx_incidents_endpoint ON incidents(endpoint_id, started_at);
  `);
}

export function seed(db: DatabaseSync): void {
  const count = db.prepare('SELECT COUNT(*) AS count FROM endpoints').get() as { count: number };
  if (count.count > 0) {
    return;
  }
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO endpoints (
      id, name, url, method, timeout_ms, interval_ms, expected_status,
      latency_threshold_ms, failure_threshold, enabled, consecutive_failures,
      next_check_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'GET', 5000, 60000, NULL, 800, 2, 1, 0, ?, ?, ?)
  `);
  const samples = [
    ['Example', 'https://example.com'],
    ['Wikipedia', 'https://www.wikipedia.org'],
    ['Cloudflare', 'https://www.cloudflare.com'],
  ];
  for (const sample of samples) {
    const name = sample[0];
    const url = sample[1];
    if (!name || !url) {
      continue;
    }
    insert.run(randomUUID(), name, url, now, now, now);
  }
}

export function listEndpoints(db: DatabaseSync): EndpointRecord[] {
  const rows = db.prepare('SELECT * FROM endpoints ORDER BY name COLLATE NOCASE').all() as unknown as EndpointRow[];
  return rows.map(mapEndpoint);
}

export function getEndpoint(db: DatabaseSync, id: string): EndpointRecord | null {
  const row = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id) as EndpointRow | undefined;
  return row ? mapEndpoint(row) : null;
}

export function createEndpoint(db: DatabaseSync, draft: EndpointDraft): EndpointRecord {
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO endpoints (
      id, name, url, method, timeout_ms, interval_ms, expected_status,
      latency_threshold_ms, failure_threshold, enabled, consecutive_failures,
      next_check_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    id,
    draft.name,
    draft.url,
    draft.method,
    draft.timeoutMs,
    draft.intervalMs,
    draft.expectedStatus,
    draft.latencyThresholdMs,
    draft.failureThreshold,
    draft.enabled ? 1 : 0,
    now,
    now,
    now,
  );
  const created = getEndpoint(db, id);
  if (!created) {
    throw new Error('Endpoint was not persisted.');
  }
  return created;
}

export function updateEndpoint(db: DatabaseSync, id: string, draft: EndpointDraft): EndpointRecord | null {
  const existing = getEndpoint(db, id);
  if (!existing) {
    return null;
  }
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE endpoints SET
      name = ?, url = ?, method = ?, timeout_ms = ?, interval_ms = ?, expected_status = ?,
      latency_threshold_ms = ?, failure_threshold = ?, enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(
    draft.name,
    draft.url,
    draft.method,
    draft.timeoutMs,
    draft.intervalMs,
    draft.expectedStatus,
    draft.latencyThresholdMs,
    draft.failureThreshold,
    draft.enabled ? 1 : 0,
    now,
    id,
  );
  return getEndpoint(db, id);
}

export function deleteEndpoint(db: DatabaseSync, id: string): boolean {
  const result = db.prepare('DELETE FROM endpoints WHERE id = ?').run(id);
  return Number(result.changes) > 0;
}

export function listDueEndpoints(db: DatabaseSync, nowIso: string): EndpointRecord[] {
  const rows = db.prepare(
    'SELECT * FROM endpoints WHERE enabled = 1 AND next_check_at <= ? ORDER BY next_check_at',
  ).all(nowIso) as unknown as EndpointRow[];
  return rows.map(mapEndpoint);
}

export function recordProbe(
  db: DatabaseSync,
  endpoint: EndpointRecord,
  observation: ProbeObservation,
  checkedAt = new Date(),
): void {
  const checkedIso = checkedAt.toISOString();
  db.prepare(`
    INSERT INTO probe_results (endpoint_id, checked_at, status_code, latency_ms, success, error_category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    endpoint.id,
    checkedIso,
    observation.statusCode,
    observation.latencyMs,
    observation.success ? 1 : 0,
    observation.errorCategory,
  );

  const openFailure = hasOpenIncident(db, endpoint.id, 'failure');
  const openLatency = hasOpenIncident(db, endpoint.id, 'latency');
  const decision = decideIncidents(
    {
      failure: openFailure,
      latency: openLatency,
      consecutiveFailures: endpoint.consecutiveFailures,
    },
    observation,
    {
      failureThreshold: endpoint.failureThreshold,
      latencyThresholdMs: endpoint.latencyThresholdMs,
    },
  );

  for (const kind of decision.open) {
    db.prepare(
      'INSERT INTO incidents (endpoint_id, kind, started_at, resolved_at, message) VALUES (?, ?, ?, NULL, ?)',
    ).run(endpoint.id, kind, checkedIso, incidentMessage(kind, observation));
  }
  for (const kind of decision.resolve) {
    db.prepare(
      `UPDATE incidents SET resolved_at = ? WHERE endpoint_id = ? AND kind = ? AND resolved_at IS NULL`,
    ).run(checkedIso, endpoint.id, kind);
  }

  const next = new Date(checkedAt.getTime() + endpoint.intervalMs).toISOString();
  db.prepare('UPDATE endpoints SET consecutive_failures = ?, next_check_at = ?, updated_at = ? WHERE id = ?').run(
    decision.consecutiveFailures,
    next,
    checkedIso,
    endpoint.id,
  );
}

export function listHistory(db: DatabaseSync, endpointId: string, sinceIso: string): ProbeResultRecord[] {
  const rows = db.prepare(`
    SELECT id, endpoint_id, checked_at, status_code, latency_ms, success, error_category
    FROM probe_results
    WHERE endpoint_id = ? AND checked_at >= ?
    ORDER BY checked_at ASC
    LIMIT 200
  `).all(endpointId, sinceIso) as unknown as {
    id: number;
    endpoint_id: string;
    checked_at: string;
    status_code: number | null;
    latency_ms: number;
    success: number;
    error_category: ErrorCategory | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    endpointId: row.endpoint_id,
    checkedAt: row.checked_at,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    success: row.success === 1,
    errorCategory: row.error_category,
  }));
}

export function listIncidents(db: DatabaseSync, endpointId?: string): IncidentRecord[] {
  const sql = endpointId
    ? `SELECT i.*, e.name AS endpoint_name FROM incidents i JOIN endpoints e ON e.id = i.endpoint_id WHERE i.endpoint_id = ? ORDER BY i.started_at DESC LIMIT 100`
    : `SELECT i.*, e.name AS endpoint_name FROM incidents i JOIN endpoints e ON e.id = i.endpoint_id ORDER BY i.started_at DESC LIMIT 100`;
  const rows = (endpointId ? db.prepare(sql).all(endpointId) : db.prepare(sql).all()) as unknown as IncidentRow[];
  return rows.map(mapIncident);
}

export function dashboard(db: DatabaseSync, now = new Date()): EndpointSummary[] {
  const since = new Date(now.getTime() - DAY_MS).toISOString();
  return listEndpoints(db).map((endpoint) => {
    const samples = listHistory(db, endpoint.id, since);
    const latest = latestProbe(db, endpoint.id);
    return {
      ...endpoint,
      status: endpoint.enabled ? (latest ? (latest.success ? 'up' : 'down') : 'unknown') : 'paused',
      uptimePercent: uptimePercent(samples),
      averageLatencyMs: averageLatency(samples),
      lastCheckedAt: latest?.checkedAt ?? null,
      lastStatusCode: latest?.statusCode ?? null,
      lastErrorCategory: latest?.errorCategory ?? null,
      openIncidentCount: countOpenIncidents(db, endpoint.id),
    };
  });
}

function latestProbe(db: DatabaseSync, endpointId: string): ProbeResultRecord | null {
  const row = db.prepare(`
    SELECT id, endpoint_id, checked_at, status_code, latency_ms, success, error_category
    FROM probe_results
    WHERE endpoint_id = ?
    ORDER BY checked_at DESC
    LIMIT 1
  `).get(endpointId) as {
    id: number;
    endpoint_id: string;
    checked_at: string;
    status_code: number | null;
    latency_ms: number;
    success: number;
    error_category: ErrorCategory | null;
  } | undefined;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    checkedAt: row.checked_at,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    success: row.success === 1,
    errorCategory: row.error_category,
  };
}

function countOpenIncidents(db: DatabaseSync, endpointId: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) AS count FROM incidents WHERE endpoint_id = ? AND resolved_at IS NULL',
  ).get(endpointId) as { count: number };
  return Number(row.count);
}

function hasOpenIncident(db: DatabaseSync, endpointId: string, kind: IncidentKind): boolean {
  const row = db.prepare(
    'SELECT id FROM incidents WHERE endpoint_id = ? AND kind = ? AND resolved_at IS NULL LIMIT 1',
  ).get(endpointId, kind) as { id: number } | undefined;
  return row !== undefined;
}

function mapEndpoint(row: EndpointRow): EndpointRecord {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    method: row.method,
    timeoutMs: row.timeout_ms,
    intervalMs: row.interval_ms,
    expectedStatus: row.expected_status,
    latencyThresholdMs: row.latency_threshold_ms,
    failureThreshold: row.failure_threshold,
    enabled: row.enabled === 1,
    consecutiveFailures: row.consecutive_failures,
    nextCheckAt: row.next_check_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface IncidentRow {
  id: number;
  endpoint_id: string;
  endpoint_name: string;
  kind: IncidentKind;
  started_at: string;
  resolved_at: string | null;
  message: string;
}

function mapIncident(row: IncidentRow): IncidentRecord {
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    endpointName: row.endpoint_name,
    kind: row.kind,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    message: row.message,
  };
}
