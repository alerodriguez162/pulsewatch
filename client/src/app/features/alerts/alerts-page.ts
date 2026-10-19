import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { ApiClient } from '../../core/api-client';
import { filterAlertRules } from '../../core/alert-rules';
import { toDraft } from '../../core/endpoint-form';
import { errorMessage } from '../../core/error-message';
import { filterIncidents, type IncidentFilter } from '../../core/incident-filter';
import type { EndpointSummary } from '../../core/models';
import { MonitoringStore } from '../../core/monitoring-store';
import { EmptyState, ErrorState, LoadingState } from '../../shared/state-panels';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-alerts-page',
  imports: [EmptyState, ErrorState, LoadingState, StatusBadge],
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
        <label class="filter">
          Rules
          <input data-testid="alert-filter" [value]="ruleQuery()" (input)="setRuleQuery($event)" />
        </label>
        @if (visibleRules().length === 0) {
          <app-empty-state title="No matching rules" message="No alert rule matches that name or URL." />
        } @else {
          <ul class="alerts">
            @for (endpoint of visibleRules(); track endpoint.id) {
              <li data-testid="alert-rule">
                <h2>{{ endpoint.name }}</h2>
                <p><app-status-badge [status]="endpoint.status" /></p>
                <p>Open incidents: {{ endpoint.openIncidentCount }}</p>
                <form novalidate (submit)="save(endpoint, $event)">
                  <label>
                    Failure threshold
                    <input
                      name="failureThreshold"
                      type="number"
                      min="1"
                      max="20"
                      required
                      data-testid="failure-threshold"
                      [value]="endpoint.failureThreshold"
                    />
                  </label>
                  <label>
                    Latency threshold (ms)
                    <input
                      name="latencyThresholdMs"
                      type="number"
                      min="50"
                      max="60000"
                      required
                      data-testid="latency-threshold"
                      [value]="endpoint.latencyThresholdMs"
                    />
                  </label>
                  <button type="submit" data-testid="save-thresholds">Save thresholds</button>
                  <button
                    type="button"
                    data-testid="check-now"
                    [disabled]="checkingId() === endpoint.id"
                    (click)="check(endpoint)"
                  >
                    {{ checkingId() === endpoint.id ? 'Checking' : 'Check now' }}
                  </button>
                </form>
              </li>
            }
          </ul>
        }
        <h2>Incident history</h2>
        <label>
          Show
          <select data-testid="incident-filter" [value]="incidentFilter()" (change)="setFilter($event)">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        @if (visibleIncidents().length === 0) {
          <p>No incidents recorded.</p>
        } @else {
          <ul class="incidents">
            @for (incident of visibleIncidents(); track incident.id) {
              <li data-testid="incident-row">
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
  readonly incidentFilter = signal<IncidentFilter>('all');
  readonly ruleQuery = signal('');
  readonly checkingId = signal<string | null>(null);
  readonly visibleRules = computed(() => filterAlertRules(this.store.endpoints(), this.ruleQuery()));
  readonly visibleIncidents = computed(() => filterIncidents(this.store.incidents(), this.incidentFilter()));
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);

  setRuleQuery(event: Event): void {
    this.ruleQuery.set(event.target instanceof HTMLInputElement ? event.target.value : '');
  }

  setFilter(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    if (value === 'all' || value === 'open' || value === 'resolved') {
      this.incidentFilter.set(value);
    }
  }

  check(endpoint: EndpointSummary): void {
    this.checkingId.set(endpoint.id);
    this.message.set(null);
    this.api
      .check(endpoint.id)
      .pipe(
        switchMap(() => this.store.refresh()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.checkingId.set(null);
          this.message.set(`Checked ${endpoint.name}.`);
        },
        error: (error: unknown) => {
          this.checkingId.set(null);
          this.message.set(errorMessage(error));
        },
      });
  }

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
    const failureThreshold = Number(data.get('failureThreshold'));
    const latencyThresholdMs = Number(data.get('latencyThresholdMs'));
    if (
      !Number.isInteger(failureThreshold) ||
      failureThreshold < 1 ||
      failureThreshold > 20 ||
      !Number.isInteger(latencyThresholdMs) ||
      latencyThresholdMs < 50 ||
      latencyThresholdMs > 60000
    ) {
      this.message.set('Thresholds must stay within the allowed range.');
      return;
    }
    const draft = toDraft({
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      timeoutSeconds: endpoint.timeoutMs / 1000,
      intervalSeconds: endpoint.intervalMs / 1000,
      expectedStatus: endpoint.expectedStatus,
      latencyThresholdMs,
      failureThreshold,
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
