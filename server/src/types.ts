export type HttpMethod = 'GET' | 'HEAD' | 'POST';

export type ErrorCategory = 'blocked' | 'dns' | 'timeout' | 'network' | 'http' | 'too_large';

export type IncidentKind = 'failure' | 'latency';

export type EndpointStatus = 'up' | 'down' | 'unknown' | 'paused';

export interface EndpointRecord {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  timeoutMs: number;
  intervalMs: number;
  expectedStatus: number | null;
  latencyThresholdMs: number;
  failureThreshold: number;
  enabled: boolean;
  consecutiveFailures: number;
  nextCheckAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointDraft {
  name: string;
  url: string;
  method: HttpMethod;
  timeoutMs: number;
  intervalMs: number;
  expectedStatus: number | null;
  latencyThresholdMs: number;
  failureThreshold: number;
  enabled: boolean;
}

export interface ProbeObservation {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorCategory: ErrorCategory | null;
}

export interface ProbeResultRecord extends ProbeObservation {
  id: number;
  endpointId: string;
  checkedAt: string;
}

export interface IncidentRecord {
  id: number;
  endpointId: string;
  endpointName: string;
  kind: IncidentKind;
  startedAt: string;
  resolvedAt: string | null;
  message: string;
}

export interface EndpointSummary extends EndpointRecord {
  status: EndpointStatus;
  uptimePercent: number | null;
  averageLatencyMs: number | null;
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  lastErrorCategory: ErrorCategory | null;
  openIncidentCount: number;
}
