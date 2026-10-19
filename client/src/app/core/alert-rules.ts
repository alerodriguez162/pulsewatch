import type { EndpointSummary } from './models';

export function filterAlertRules(
  endpoints: readonly EndpointSummary[],
  query: string,
): EndpointSummary[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...endpoints];
  }
  return endpoints.filter(
    (endpoint) =>
      endpoint.name.toLowerCase().includes(needle) || endpoint.url.toLowerCase().includes(needle),
  );
}
