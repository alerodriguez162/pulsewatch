import type { EndpointStatus, EndpointSummary } from './models';

export type SortKey = 'name' | 'status' | 'uptime' | 'latency';

export interface EndpointSort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const statusRank: Record<EndpointStatus, number> = {
  down: 0,
  unknown: 1,
  paused: 2,
  up: 3,
};

export function filterAndSort(
  endpoints: readonly EndpointSummary[],
  query: string,
  sort: EndpointSort,
): EndpointSummary[] {
  const needle = query.trim().toLowerCase();
  const filtered = endpoints.filter((endpoint) => {
    if (!needle) {
      return true;
    }
    return (
      endpoint.name.toLowerCase().includes(needle) ||
      endpoint.url.toLowerCase().includes(needle) ||
      endpoint.status.includes(needle)
    );
  });
  const factor = sort.dir === 'asc' ? 1 : -1;
  return filtered.sort((left, right) => compare(left, right, sort.key) * factor);
}

function compare(left: EndpointSummary, right: EndpointSummary, key: SortKey): number {
  if (key === 'name') {
    return left.name.localeCompare(right.name);
  }
  if (key === 'status') {
    return statusRank[left.status] - statusRank[right.status];
  }
  if (key === 'uptime') {
    return compareNullable(left.uptimePercent, right.uptimePercent);
  }
  return compareNullable(left.averageLatencyMs, right.averageLatencyMs);
}

function compareNullable(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}
