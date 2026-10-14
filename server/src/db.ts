import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import type { EndpointDraft, EndpointRecord, EndpointSummary, HttpMethod } from './types.js';

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

export function dashboard(db: DatabaseSync): EndpointSummary[] {
  return listEndpoints(db).map((endpoint) => ({
    ...endpoint,
    status: endpoint.enabled ? 'unknown' : 'paused',
    uptimePercent: null,
    averageLatencyMs: null,
    lastCheckedAt: null,
    lastStatusCode: null,
    lastErrorCategory: null,
    openIncidentCount: 0,
  }));
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
