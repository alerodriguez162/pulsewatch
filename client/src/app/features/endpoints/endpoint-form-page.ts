import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';

import { ApiClient } from '../../core/api-client';
import { createEndpointForm, toDraft, toFormValue } from '../../core/endpoint-form';
import { errorMessage } from '../../core/error-message';
import type { HttpMethod } from '../../core/models';
import { MonitoringStore } from '../../core/monitoring-store';
import { LoadingState } from '../../shared/state-panels';

@Component({
  selector: 'app-endpoint-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButton,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    LoadingState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>{{ id() ? 'Edit endpoint' : 'Add endpoint' }}</h1>
          <p>PulseWatch checks this URL from the server. Private networks are rejected.</p>
        </div>
        <a matButton routerLink="/endpoints">Back</a>
      </header>

      @if (loading()) {
        <app-loading-state message="Loading endpoint" />
      } @else {
        <form class="form" data-testid="endpoint-form" [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" required data-testid="endpoint-name" />
            @if (form.controls['name']?.touched && form.controls['name']?.hasError('required')) {
              <mat-error>Name is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>URL</mat-label>
            <input matInput formControlName="url" required data-testid="endpoint-url" />
            @if (form.controls['url']?.touched && form.controls['url']?.hasError('required')) {
              <mat-error data-testid="url-error">URL is required.</mat-error>
            }
            @if (form.controls['url']?.touched && form.controls['url']?.hasError('url')) {
              <mat-error data-testid="url-error">Enter an http or https URL.</mat-error>
            }
            @if (form.controls['url']?.touched && form.controls['url']?.hasError('privateNetwork')) {
              <mat-error data-testid="url-error">Private and local addresses are blocked.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Method</mat-label>
            <mat-select formControlName="method">
              @for (method of methods; track method) {
                <mat-option [value]="method">{{ method }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Timeout (seconds)</mat-label>
            <input matInput type="number" formControlName="timeoutSeconds" min="1" max="30" required />
            @if (form.controls['timeoutSeconds']?.touched && form.controls['timeoutSeconds']?.invalid) {
              <mat-error>Use 1 to 30 seconds.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Polling interval (seconds)</mat-label>
            <input matInput type="number" formControlName="intervalSeconds" min="15" max="86400" required />
            <mat-hint>Minimum 15 seconds.</mat-hint>
            @if (form.controls['intervalSeconds']?.touched && form.controls['intervalSeconds']?.invalid) {
              <mat-error>Use 15 seconds to 24 hours.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Expected status</mat-label>
            <input matInput type="number" formControlName="expectedStatus" min="100" max="599" />
            <mat-hint>Leave empty to accept any 2xx response.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Latency threshold (ms)</mat-label>
            <input matInput type="number" formControlName="latencyThresholdMs" min="50" max="60000" required />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Failure threshold</mat-label>
            <input matInput type="number" formControlName="failureThreshold" min="1" max="20" required />
            <mat-hint>Consecutive failures before an incident opens.</mat-hint>
          </mat-form-field>

          <mat-slide-toggle formControlName="enabled">Enabled</mat-slide-toggle>

          @if (formError(); as message) {
            <p class="banner" role="alert">{{ message }}</p>
          }

          <div class="actions">
            <button matButton="filled" type="submit" data-testid="save-endpoint" [disabled]="saving()">
              {{ saving() ? 'Saving' : 'Save endpoint' }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class EndpointFormPage {
  readonly id = input<string>();
  readonly methods: readonly HttpMethod[] = ['GET', 'HEAD', 'POST'];
  readonly form = createEndpointForm();
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  private readonly api = inject(ApiClient);
  private readonly store = inject(MonitoringStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          if (!id) {
            this.loading.set(false);
            return EMPTY;
          }
          this.loading.set(true);
          return this.api.getEndpoint(id).pipe(
            tap((endpoint) => {
              this.form.reset(toFormValue(endpoint));
              this.loading.set(false);
            }),
            catchError((error: unknown) => {
              this.formError.set(errorMessage(error));
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const draft = toDraft(this.form.getRawValue());
    const id = this.id();
    const request = id ? this.api.updateEndpoint(id, draft) : this.api.createEndpoint(draft);
    request
      .pipe(
        switchMap(() => this.store.refresh()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigateByUrl('/endpoints');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(errorMessage(error));
        },
      });
  }
}
