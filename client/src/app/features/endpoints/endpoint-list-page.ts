import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { switchMap } from 'rxjs';

import { ApiClient } from '../../core/api-client';
import { errorMessage } from '../../core/error-message';
import type { EndpointSummary } from '../../core/models';
import { MonitoringStore } from '../../core/monitoring-store';
import { EndpointFilters } from '../../shared/endpoint-filters';
import { EndpointTable } from '../../shared/endpoint-table';
import { EmptyState, ErrorState, LoadingState } from '../../shared/state-panels';

@Component({
  selector: 'app-endpoint-list-page',
  imports: [RouterLink, MatButton, EndpointFilters, EndpointTable, EmptyState, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Endpoints</h1>
          <p>Create, edit, and remove the URLs PulseWatch checks.</p>
        </div>
        <a matButton="filled" routerLink="/endpoints/new" data-testid="create-endpoint">Add endpoint</a>
      </header>

      @if (store.loading() && store.generatedAt() === null) {
        <app-loading-state />
      } @else if (store.errorMessage() && store.generatedAt() === null) {
        <app-error-state [message]="store.errorMessage() ?? ''" (retry)="retry()" />
      } @else if (store.endpoints().length === 0) {
        <app-empty-state title="No endpoints yet" message="Add the first URL you want to monitor.">
          <a matButton="filled" routerLink="/endpoints/new">Add endpoint</a>
        </app-empty-state>
      } @else {
        @if (actionError(); as message) {
          <p class="banner" role="alert">{{ message }}</p>
        }
        <app-endpoint-filters />
        @if (store.visibleEndpoints().length === 0) {
          <app-empty-state title="No matches" message="No endpoint matches that filter." />
        } @else {
          <app-endpoint-table
            [endpoints]="store.visibleEndpoints()"
            [manage]="true"
            [pendingDelete]="pendingDelete()"
            (requestDelete)="pendingDelete.set($event)"
            (cancelDelete)="pendingDelete.set(null)"
            (confirmDelete)="remove($event)"
          />
        }
      }
    </section>
  `,
})
export class EndpointListPage {
  readonly store = inject(MonitoringStore);
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly pendingDelete = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  retry(): void {
    this.store.loading.set(true);
    this.store.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  remove(endpoint: EndpointSummary): void {
    this.actionError.set(null);
    this.api
      .deleteEndpoint(endpoint.id)
      .pipe(
        switchMap(() => this.store.refresh()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.pendingDelete.set(null),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }
}
