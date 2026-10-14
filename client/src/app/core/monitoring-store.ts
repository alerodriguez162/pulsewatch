import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, catchError, tap } from 'rxjs';

import { ApiClient } from './api-client';
import { filterAndSort, type EndpointSort, type SortKey } from './endpoint-query';
import { errorMessage } from './error-message';
import type { EndpointSummary, Incident } from './models';

@Injectable({ providedIn: 'root' })
export class MonitoringStore {
  private readonly api = inject(ApiClient);

  readonly endpoints = signal<EndpointSummary[]>([]);
  readonly incidents = signal<Incident[]>([]);
  readonly generatedAt = signal<string | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly query = signal('');
  readonly sortKey = signal<SortKey>('name');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly sort = computed<EndpointSort>(() => ({ key: this.sortKey(), dir: this.sortDir() }));

  readonly visibleEndpoints = computed(() =>
    filterAndSort(this.endpoints(), this.query(), this.sort()),
  );

  readonly summary = computed(() => {
    const endpoints = this.endpoints();
    const uptimeSamples = endpoints
      .map((endpoint) => endpoint.uptimePercent)
      .filter((value): value is number => value !== null);
    const latencySamples = endpoints
      .map((endpoint) => endpoint.averageLatencyMs)
      .filter((value): value is number => value !== null);
    return {
      total: endpoints.length,
      up: endpoints.filter((endpoint) => endpoint.status === 'up').length,
      down: endpoints.filter((endpoint) => endpoint.status === 'down').length,
      openIncidents: endpoints.reduce((sum, endpoint) => sum + endpoint.openIncidentCount, 0),
      uptime: uptimeSamples.length
        ? Math.round((uptimeSamples.reduce((sum, value) => sum + value, 0) / uptimeSamples.length) * 10) / 10
        : null,
      latency: latencySamples.length
        ? Math.round(latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length)
        : null,
    };
  });

  refresh() {
    return this.api.dashboard().pipe(
      tap((dashboard) => {
        this.endpoints.set(dashboard.endpoints);
        this.incidents.set(dashboard.recentIncidents);
        this.generatedAt.set(dashboard.generatedAt);
        this.loading.set(false);
        this.errorMessage.set(null);
      }),
      catchError((error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(errorMessage(error));
        return EMPTY;
      }),
    );
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('asc');
  }
}
