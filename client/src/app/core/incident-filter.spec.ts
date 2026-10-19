import { filterIncidents } from './incident-filter';
import type { Incident } from './models';

const openIncident: Incident = {
  id: 1,
  endpointId: 'ep-down',
  endpointName: 'Billing',
  kind: 'failure',
  startedAt: '2026-10-21T17:00:00.000Z',
  resolvedAt: null,
  message: 'HTTP 503 did not meet the expected status.',
};

const resolvedIncident: Incident = {
  id: 2,
  endpointId: 'ep-up',
  endpointName: 'Example',
  kind: 'latency',
  startedAt: '2026-10-20T17:00:00.000Z',
  resolvedAt: '2026-10-20T18:00:00.000Z',
  message: 'Latency recovered.',
};

describe('filterIncidents', () => {
  const incidents = [openIncident, resolvedIncident];

  it('returns every incident for the all filter', () => {
    expect(filterIncidents(incidents, 'all')).toEqual(incidents);
  });

  it('keeps open incidents', () => {
    expect(filterIncidents(incidents, 'open')).toEqual([openIncident]);
  });

  it('keeps resolved incidents', () => {
    expect(filterIncidents(incidents, 'resolved')).toEqual([resolvedIncident]);
  });
});
