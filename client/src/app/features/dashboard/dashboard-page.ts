import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';

import { formatLatency, formatPercent, formatTime } from '../../core/format';
import { MonitoringStore } from '../../core/monitoring-store';
import { EndpointFilters } from '../../shared/endpoint-filters';
import { EndpointTable } from '../../shared/endpoint-table';
import { EmptyState, ErrorState, LoadingState } from '../../shared/state-panels';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, MatButton, EndpointFilters, EndpointTable, EmptyState, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" data-testid="dashboard">
      <header class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live results from server-side probes. Missing history stays blank until a check completes.</p>
        </div>
        <a matButton="filled" routerLink="/endpoints/new" data-testid="create-endpoint">Add endpoint</a>
      </header>

      @if (store.loading()) {
        <app-loading-state />
      } @else if (store.errorMessage() && store.generatedAt() === null) {
        <app-error-state [message]="store.errorMessage() ?? ''" (retry)="retry()" />
      } @else if (store.endpoints().length === 0) {
        <app-empty-state
          title="No endpoints yet"
          message="Add an HTTP endpoint to start recording status and latency."
        >
          <a matButton="filled" routerLink="/endpoints/new">Add endpoint</a>
        </app-empty-state>
      } @else {
        @if (store.errorMessage(); as message) {
          <p class="banner" role="alert">{{ message }}</p>
        }
        <p class="meta">Updated {{ formatTime(store.generatedAt()) }}</p>
        <div class="cards">
          <article class="card">
            <h2>Endpoints</h2>
            <p>{{ store.summary().total }}</p>
          </article>
          <article class="card">
            <h2>Up</h2>
            <p>{{ store.summary().up }}</p>
          </article>
          <article class="card">
            <h2>Down</h2>
            <p>{{ store.summary().down }}</p>
          </article>
          <article class="card">
            <h2>Uptime</h2>
            <p>{{ formatPercent(store.summary().uptime) }}</p>
          </article>
          <article class="card">
            <h2>Avg latency</h2>
            <p>{{ formatLatency(store.summary().latency) }}</p>
          </article>
          <article class="card">
            <h2>Open incidents</h2>
            <p>{{ store.summary().openIncidents }}</p>
          </article>
        </div>
        <app-endpoint-filters />
        @if (store.visibleEndpoints().length === 0) {
          <app-empty-state title="No matches" message="Try a different name, URL, or status." />
        } @else {
          <app-endpoint-table [endpoints]="store.visibleEndpoints()" />
        }
        <section>
          <h2>Recent incidents</h2>
          @if (store.incidents().length === 0) {
            <p>No incidents recorded.</p>
          } @else {
            <ul class="incidents">
              @for (incident of store.incidents(); track incident.id) {
                <li>
                  <a [routerLink]="['/monitoring', incident.endpointId]">{{ incident.endpointName }}</a>
                  <span>{{ incident.kind }} · {{ incident.resolvedAt ? 'Resolved' : 'Open' }}</span>
                  <p>{{ incident.message }}</p>
                  <p>{{ formatTime(incident.startedAt) }}</p>
                </li>
              }
            </ul>
          }
        </section>
      }
    </section>
  `,
})
export class DashboardPage {
  readonly store = inject(MonitoringStore);
  readonly formatPercent = formatPercent;
  readonly formatLatency = formatLatency;
  readonly formatTime = formatTime;

  retry(): void {
    this.store.loading.set(true);
    this.store.refresh().subscribe();
  }
}
