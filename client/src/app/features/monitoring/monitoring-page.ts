import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { forkJoin } from 'rxjs';

import { ApiClient } from '../../core/api-client';
import { errorMessage } from '../../core/error-message';
import { formatLatency, formatPercent, formatTime } from '../../core/format';
import type { Endpoint, Incident, ProbeResult } from '../../core/models';
import { MonitoringStore } from '../../core/monitoring-store';
import { MetricChart } from '../../shared/metric-chart';
import { ErrorState, LoadingState } from '../../shared/state-panels';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-monitoring-page',
  imports: [RouterLink, MatButton, MetricChart, ErrorState, LoadingState, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" data-testid="monitoring">
      @if (loading()) {
        <app-loading-state message="Loading history" />
      } @else if (error(); as message) {
        <app-error-state [message]="message" (retry)="load()" />
      } @else if (endpoint(); as current) {
        <header class="page-header">
          <div>
            <h1>{{ current.name }}</h1>
            <p>{{ current.method }} {{ current.url }}</p>
          </div>
          <a matButton routerLink="/endpoints">Back</a>
        </header>
        <div class="cards">
          <article class="card">
            <h2>Status</h2>
            <p><app-status-badge [status]="summaryStatus()" /></p>
          </article>
          <article class="card">
            <h2>Uptime 24h</h2>
            <p>{{ formatPercent(summary()?.uptimePercent ?? null) }}</p>
          </article>
          <article class="card">
            <h2>Avg latency</h2>
            <p>{{ formatLatency(summary()?.averageLatencyMs ?? null) }}</p>
          </article>
        </div>
        <button matButton="filled" type="button" data-testid="check-now" [disabled]="checking() || !current.enabled" (click)="check()">
          {{ checking() ? 'Checking' : 'Check now' }}
        </button>
        @if (history().length === 0) {
          <p>No probes recorded in the last 24 hours.</p>
        } @else {
          <app-metric-chart
            caption="Latency over the last 24 hours"
            kind="line"
            [labels]="historyLabels()"
            [values]="historyValues()"
          />
        }
        <h2>Incidents</h2>
        @if (incidents().length === 0) {
          <p>No incidents for this endpoint.</p>
        } @else {
          <ul class="incidents">
            @for (incident of incidents(); track incident.id) {
              <li>
                <span>{{ incident.kind }} · {{ incident.resolvedAt ? 'Resolved' : 'Open' }}</span>
                <p>{{ incident.message }}</p>
                <p>{{ formatTime(incident.startedAt) }}</p>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class MonitoringPage {
  readonly id = input.required<string>();
  readonly endpoint = signal<Endpoint | null>(null);
  readonly history = signal<ProbeResult[]>([]);
  readonly incidents = signal<Incident[]>([]);
  readonly loading = signal(true);
  readonly checking = signal(false);
  readonly error = signal<string | null>(null);
  readonly formatPercent = formatPercent;
  readonly formatLatency = formatLatency;
  readonly formatTime = formatTime;
  private readonly api = inject(ApiClient);
  private readonly store = inject(MonitoringStore);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.id();
      this.load();
    });
  }

  readonly summary = () => this.store.endpoints().find((item) => item.id === this.id()) ?? null;

  summaryStatus() {
    return this.summary()?.status ?? (this.endpoint()?.enabled ? 'unknown' : 'paused');
  }

  historyLabels(): string[] {
    return this.history().map((point) => formatTime(point.checkedAt));
  }

  historyValues(): number[] {
    return this.history().map((point) => point.latencyMs);
  }

  load(): void {
    const id = this.id();
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      endpoint: this.api.getEndpoint(id),
      history: this.api.history(id),
      incidents: this.api.incidents(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.endpoint.set(result.endpoint);
          this.history.set(result.history);
          this.incidents.set(result.incidents);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  check(): void {
    this.checking.set(true);
    this.api
      .check(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.checking.set(false);
          this.store.refresh().subscribe();
          this.load();
        },
        error: (error: unknown) => {
          this.checking.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
}
