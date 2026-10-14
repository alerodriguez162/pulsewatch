import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';

import { MonitoringStore } from '../core/monitoring-store';

@Component({
  selector: 'app-endpoint-filters',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="filter">
      <span>Filter endpoints</span>
      <input
        type="search"
        data-testid="endpoint-filter"
        [formControl]="search"
        placeholder="Name, URL, or status"
      />
    </label>
  `,
})
export class EndpointFilters {
  private readonly store = inject(MonitoringStore);
  readonly search = new FormControl(this.store.query(), { nonNullable: true });

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(destroyRef))
      .subscribe((value) => this.store.query.set(value));
  }
}
