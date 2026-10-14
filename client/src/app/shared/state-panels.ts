import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  imports: [MatProgressSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" role="status" data-testid="loading-state">
      <mat-progress-spinner mode="indeterminate" diameter="36" />
      <p>{{ message() }}</p>
    </div>
  `,
})
export class LoadingState {
  readonly message = input('Loading monitoring data');
}

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" data-testid="empty-state">
      <h2>{{ title() }}</h2>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly title = input('Nothing here yet');
  readonly message = input('');
}

@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel panel-error" role="alert" data-testid="error-state">
      <h2>Something went wrong</h2>
      <p>{{ message() }}</p>
      <button type="button" (click)="retry.emit()">Try again</button>
    </div>
  `,
})
export class ErrorState {
  readonly message = input('The monitoring API is unavailable.');
  readonly retry = output<void>();
}
