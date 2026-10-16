import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MonitoringStore } from '../../core/monitoring-store';
import { MetricChart } from '../../shared/metric-chart';
import { EmptyState, ErrorState, LoadingState } from '../../shared/state-panels';

@Component({
  selector: 'app-analytics-page',
  imports: [MetricChart, EmptyState, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Latency and uptime from probes recorded in the last 24 hours.</p>
        </div>
      </header>
      @if (store.loading() && store.generatedAt() === null) {
        <app-loading-state />
      } @else if (store.errorMessage() && store.generatedAt() === null) {
        <app-error-state [message]="store.errorMessage() ?? ''" (retry)="retry()" />
      } @else if (latency().labels.length === 0 && uptime().labels.length === 0) {
        <app-empty-state
          title="No probe history yet"
          message="Charts appear after the server records real checks. Nothing here is estimated."
        />
      } @else {
        @if (latency().labels.length > 0) {
          <app-metric-chart caption="Average latency by endpoint" kind="bar" [labels]="latency().labels" [values]="latency().values" />
        }
        @if (uptime().labels.length > 0) {
          <app-metric-chart caption="Uptime percent by endpoint" kind="bar" [labels]="uptime().labels" [values]="uptime().values" />
        }
      }
    </section>
  `,
})
export class AnalyticsPage {
  readonly store = inject(MonitoringStore);
  readonly latency = computed(() => series(this.store.endpoints(), 'averageLatencyMs'));
  readonly uptime = computed(() => series(this.store.endpoints(), 'uptimePercent'));

  retry(): void {
    this.store.loading.set(true);
    this.store.refresh().subscribe();
  }
}

function series(
  endpoints: { name: string; averageLatencyMs: number | null; uptimePercent: number | null }[],
  key: 'averageLatencyMs' | 'uptimePercent',
): { labels: string[]; values: number[] } {
  const points = endpoints.filter((endpoint) => endpoint[key] !== null);
  return {
    labels: points.map((endpoint) => endpoint.name),
    values: points.map((endpoint) => endpoint[key] ?? 0),
  };
}
