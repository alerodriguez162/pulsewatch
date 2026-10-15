import type { ErrorCategory, IncidentKind } from './types.js';

export interface OpenIncidents {
  failure: boolean;
  latency: boolean;
  consecutiveFailures: number;
}

export interface IncidentThresholds {
  failureThreshold: number;
  latencyThresholdMs: number;
}

export interface ProbeForIncidents {
  success: boolean;
  latencyMs: number;
  errorCategory: ErrorCategory | null;
  statusCode?: number | null;
}

export interface IncidentDecision {
  open: IncidentKind[];
  resolve: IncidentKind[];
  consecutiveFailures: number;
}

export function decideIncidents(
  open: OpenIncidents,
  probe: ProbeForIncidents,
  thresholds: IncidentThresholds,
): IncidentDecision {
  const consecutiveFailures = probe.success ? 0 : open.consecutiveFailures + 1;
  const toOpen: IncidentKind[] = [];
  const toResolve: IncidentKind[] = [];

  if (!probe.success && !open.failure && consecutiveFailures >= thresholds.failureThreshold) {
    toOpen.push('failure');
  }
  if (probe.success && open.failure) {
    toResolve.push('failure');
  }

  const completed = probe.errorCategory === null || probe.errorCategory === 'http';
  const slow = completed && probe.latencyMs > thresholds.latencyThresholdMs;
  if (slow && !open.latency) {
    toOpen.push('latency');
  }
  if (completed && !slow && open.latency) {
    toResolve.push('latency');
  }

  return { open: toOpen, resolve: toResolve, consecutiveFailures };
}

export function incidentMessage(kind: IncidentKind, probe: ProbeForIncidents): string {
  if (kind === 'latency') {
    return `Latency ${probe.latencyMs} ms exceeded the configured threshold.`;
  }
  if (probe.errorCategory === 'timeout') {
    return 'The endpoint timed out.';
  }
  if (probe.errorCategory === 'blocked') {
    return 'The probe was blocked by the safety checks.';
  }
  if (probe.errorCategory === 'http') {
    return `HTTP ${probe.statusCode ?? 'response'} did not meet the expected status.`;
  }
  return probe.errorCategory ? `Probe failed (${probe.errorCategory}).` : 'The endpoint check failed.';
}
