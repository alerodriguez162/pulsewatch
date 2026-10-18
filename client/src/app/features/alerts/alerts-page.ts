import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { ApiClient } from '../../core/api-client';
import { toDraft } from '../../core/endpoint-form';
import { errorMessage } from '../../core/error-message';
import type { EndpointSummary } from '../../core/models';
import { MonitoringStore } from '../../core/monitoring-store';
import { EmptyState, ErrorState, LoadingState } from '../../shared/state-panels';

@Component({
  selector: 'app-alerts-page',
  imports: [EmptyState, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Alerts</h1>
          <p>Incidents open after consecutive failures or when a completed response is slower than the latency threshold.</p>
        </div>
      </header>
      @if (store.loading() && store.generatedAt() === null) {
        <app-loading-state />
      } @else if (store.errorMessage() && store.generatedAt() === null) {
        <app-error-state [message]="store.errorMessage() ?? ''" (retry)="retry()" />
      } @else if (store.endpoints().length === 0) {
        <app-empty-state title="No alert rules" message="Add an endpoint before configuring thresholds." />
      } @else {
        @if (message(); as text) {
          <p class="banner" role="status">{{ text }}</p>
        }
        <ul class="alerts">
          @for (endpoint of store.endpoints(); track endpoint.id) {
            <li>
              <h2>{{ endpoint.name }}</h2>
              <p>Open incidents: {{ endpoint.openIncidentCount }}</p>
              <form (submit)="save(endpoint, $event)">
                <label>
                  Failure threshold
                  <input name="failureThreshold" type="number" min="1" max="20" required [value]="endpoint.failureThreshold" />
                </label>
                <label>
                  Latency threshold (ms)
                  <input name="latencyThresholdMs" type="number" min="50" max="60000" required [value]="endpoint.latencyThresholdMs" />
                </label>
                <button type="submit">Save thresholds</button>
              </form>
            </li>
          }
        </ul>
        <h2>Incident history</h2>
        @if (store.incidents().length === 0) {
          <p>No incidents recorded.</p>
        } @else {
          <ul class="incidents">
            @for (incident of store.incidents(); track incident.id) {
              <li>
                <span>{{ incident.endpointName }} · {{ incident.kind }} · {{ incident.resolvedAt ? 'Resolved' : 'Open' }}</span>
                <p>{{ incident.message }}</p>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class AlertsPage {
  readonly store = inject(MonitoringStore);
  readonly message = signal<string | null>(null);
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);

  retry(): void {
    this.store.loading.set(true);
    this.store.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  save(endpoint: EndpointSummary, event: Event): void {
    event.preventDefault();
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
    const draft = toDraft({
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      timeoutSeconds: endpoint.timeoutMs / 1000,
      intervalSeconds: endpoint.intervalMs / 1000,
      expectedStatus: endpoint.expectedStatus,
      latencyThresholdMs: Number(data.get('latencyThresholdMs')),
      failureThreshold: Number(data.get('failureThreshold')),
      enabled: endpoint.enabled,
    });
    this.api
      .updateEndpoint(endpoint.id, draft)
      .pipe(
        switchMap(() => this.store.refresh()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.message.set(`Saved thresholds for ${endpoint.name}.`),
        error: (error: unknown) => this.message.set(errorMessage(error)),
      });
  }
}
