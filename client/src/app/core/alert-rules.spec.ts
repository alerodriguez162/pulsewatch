import { filterAlertRules } from './alert-rules';
import type { EndpointSummary } from './models';

function endpoint(name: string, url: string): EndpointSummary {
  return {
    id: name,
    name,
    url,
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
    status: 'up',
    uptimePercent: 99,
    averageLatencyMs: 100,
    lastCheckedAt: null,
    lastStatusCode: null,
    lastErrorCategory: null,
    openIncidentCount: 0,
  };
}

describe('filterAlertRules', () => {
  const endpoints = [endpoint('Example', 'https://example.com'), endpoint('Billing', 'https://billing.example.com')];

  it('returns every rule when the query is blank', () => {
    expect(filterAlertRules(endpoints, '  ')).toEqual(endpoints);
  });

  it('matches a rule by name or URL', () => {
    expect(filterAlertRules(endpoints, 'bill').map((endpoint) => endpoint.name)).toEqual(['Billing']);
    expect(filterAlertRules(endpoints, 'example.com').map((endpoint) => endpoint.name)).toEqual([
      'Example',
      'Billing',
    ]);
  });
});
