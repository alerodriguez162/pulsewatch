import { filterAndSort } from './endpoint-query';
import { formatLatency, formatPercent } from './format';
import type { EndpointSummary } from './models';

function endpoint(overrides: Partial<EndpointSummary>): EndpointSummary {
  return {
    id: overrides.id ?? '1',
    name: overrides.name ?? 'Example',
    url: overrides.url ?? 'https://example.com',
    method: 'GET',
    timeoutMs: 5000,
    intervalMs: 60000,
    expectedStatus: null,
    latencyThresholdMs: 800,
    failureThreshold: 2,
    enabled: true,
    consecutiveFailures: 0,
    nextCheckAt: '2026-10-21T00:00:00.000Z',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    status: overrides.status ?? 'unknown',
    uptimePercent: overrides.uptimePercent === undefined ? null : overrides.uptimePercent,
    averageLatencyMs: overrides.averageLatencyMs === undefined ? null : overrides.averageLatencyMs,
    lastCheckedAt: null,
    lastStatusCode: null,
    lastErrorCategory: null,
    openIncidentCount: 0,
  };
}

describe('endpoint query', () => {
  const endpoints = [
    endpoint({ id: 'b', name: 'Beta', status: 'up', uptimePercent: 99, averageLatencyMs: 40 }),
    endpoint({ id: 'a', name: 'Alpha', url: 'https://alpha.test', status: 'down', uptimePercent: 10, averageLatencyMs: 900 }),
  ];

  it('filters by name, url, and status', () => {
    expect(filterAndSort(endpoints, 'alpha', { key: 'name', dir: 'asc' }).map((item) => item.id)).toEqual(['a']);
    expect(filterAndSort(endpoints, 'down', { key: 'name', dir: 'asc' }).map((item) => item.id)).toEqual(['a']);
  });

  it('sorts by uptime and keeps missing metrics last', () => {
    const withGap = [...endpoints, endpoint({ id: 'c', name: 'Gamma', uptimePercent: null })];
    expect(filterAndSort(withGap, '', { key: 'uptime', dir: 'asc' }).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('metric formatting', () => {
  it('does not present missing measurements as zero', () => {
    expect(formatPercent(null)).toBe('No data');
    expect(formatLatency(null)).toBe('No data');
    expect(formatPercent(99.9)).toBe('99.9%');
    expect(formatLatency(120)).toBe('120 ms');
  });
});
