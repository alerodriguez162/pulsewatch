import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatLatency, formatPercent, formatTime } from '../core/format';
import type { EndpointSummary } from '../core/models';
import { MonitoringStore } from '../core/monitoring-store';
import type { SortKey } from '../core/endpoint-query';
import { StatusBadge } from './status-badge';

@Component({
  selector: 'app-endpoint-table',
  imports: [RouterLink, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <table>
        <caption class="sr-only">Monitored endpoints</caption>
        <thead>
          <tr>
            <th [attr.aria-sort]="ariaSort('name')">
              <button type="button" data-testid="sort-name" (click)="store.toggleSort('name')">Name</button>
            </th>
            <th>URL</th>
            <th [attr.aria-sort]="ariaSort('status')">
              <button type="button" data-testid="sort-status" (click)="store.toggleSort('status')">Status</button>
            </th>
            <th [attr.aria-sort]="ariaSort('uptime')">
              <button type="button" data-testid="sort-uptime" (click)="store.toggleSort('uptime')">Uptime 24h</button>
            </th>
            <th [attr.aria-sort]="ariaSort('latency')">
              <button type="button" data-testid="sort-latency" (click)="store.toggleSort('latency')">Avg latency</button>
            </th>
            <th>Last check</th>
            @if (manage()) {
              <th>Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (endpoint of endpoints(); track endpoint.id) {
            <tr data-testid="endpoint-row">
              <td>
                <a [routerLink]="['/monitoring', endpoint.id]">{{ endpoint.name }}</a>
              </td>
              <td class="url">{{ endpoint.method }} {{ endpoint.url }}</td>
              <td><app-status-badge [status]="endpoint.status" /></td>
              <td>{{ formatPercent(endpoint.uptimePercent) }}</td>
              <td>{{ formatLatency(endpoint.averageLatencyMs) }}</td>
              <td>{{ formatTime(endpoint.lastCheckedAt) }}</td>
              @if (manage()) {
                <td class="actions">
                  <a [routerLink]="['/endpoints', endpoint.id]">Edit</a>
                  @if (pendingDelete() === endpoint.id) {
                    <button type="button" data-testid="confirm-delete" (click)="confirmDelete.emit(endpoint)">
                      Confirm delete
                    </button>
                    <button type="button" data-testid="cancel-delete" (click)="cancelDelete.emit()">Cancel</button>
                  } @else {
                    <button type="button" data-testid="delete-endpoint" (click)="requestDelete.emit(endpoint.id)">
                      Delete
                    </button>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class EndpointTable {
  readonly store = inject(MonitoringStore);
  readonly endpoints = input.required<EndpointSummary[]>();
  readonly manage = input(false);
  readonly pendingDelete = input<string | null>(null);
  readonly requestDelete = output<string>();
  readonly confirmDelete = output<EndpointSummary>();
  readonly cancelDelete = output<void>();
  readonly formatPercent = formatPercent;
  readonly formatLatency = formatLatency;
  readonly formatTime = formatTime;

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.store.sortKey() !== key) {
      return 'none';
    }
    return this.store.sortDir() === 'asc' ? 'ascending' : 'descending';
  }
}
