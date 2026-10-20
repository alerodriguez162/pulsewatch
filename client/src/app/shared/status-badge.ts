import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EndpointStatus } from '../core/models';

const labels: Record<EndpointStatus, string> = {
  up: 'Up',
  down: 'Down',
  unknown: 'Unknown',
  paused: 'Paused',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span data-testid="status-badge" [class]="'status status-' + status()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<EndpointStatus>();
  readonly label = computed(() => labels[this.status()]);
}
