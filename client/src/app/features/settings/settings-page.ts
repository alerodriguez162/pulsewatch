import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { POLL_INTERVALS_MS, PollIntervalService } from '../../core/poll-interval.service';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page settings">
      <header class="page-header">
        <div>
          <h1>Settings</h1>
          <p>Appearance and how local monitoring behaves.</p>
        </div>
      </header>
      <article class="card">
        <h2>Theme</h2>
        <p>The current theme is {{ theme.mode() }}.</p>
        <button type="button" data-testid="theme-toggle" [attr.aria-pressed]="theme.mode() === 'dark'" (click)="theme.toggle()">
          {{ theme.mode() === 'dark' ? 'Use light mode' : 'Use dark mode' }}
        </button>
      </article>
      <article class="card">
        <h2>Dashboard refresh</h2>
        <p>How often the dashboard asks the API for the latest probe results.</p>
        <label>
          Interval
          <select data-testid="poll-interval" [value]="poll.intervalMs().toString()" (change)="setInterval($event)">
            @for (intervalMs of intervals; track intervalMs) {
              <option [value]="intervalMs.toString()">Every {{ intervalMs / 1000 }} seconds</option>
            }
          </select>
        </label>
        <span class="meta" data-testid="poll-summary">Refreshing every {{ poll.intervalMs() / 1000 }} seconds.</span>
      </article>
      <article class="card">
        <h2>Probes</h2>
        <p>
          Checks run on the API process, not in the browser. Seeded endpoints are public URLs and start with no
          fabricated history.
        </p>
      </article>
    </section>
  `,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly poll = inject(PollIntervalService);
  readonly intervals = POLL_INTERVALS_MS;

  setInterval(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? Number(event.target.value) : Number.NaN;
    this.poll.set(value);
  }
}
