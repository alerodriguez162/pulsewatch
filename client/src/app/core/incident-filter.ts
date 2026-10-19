import type { Incident } from './models';

export type IncidentFilter = 'all' | 'open' | 'resolved';

export function filterIncidents(
  incidents: readonly Incident[],
  filter: IncidentFilter,
): Incident[] {
  if (filter === 'open') {
    return incidents.filter((incident) => incident.resolvedAt === null);
  }
  if (filter === 'resolved') {
    return incidents.filter((incident) => incident.resolvedAt !== null);
  }
  return [...incidents];
}
