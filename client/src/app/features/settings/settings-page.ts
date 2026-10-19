import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Settings</h1>
          <p>Appearance and how local monitoring behaves.</p>
        </div>
      </header>
      <article class="card">
        <h2>Theme</h2>
        <p>The current theme is {{ theme.mode() }}.</p>
        <button type="button" [attr.aria-pressed]="theme.mode() === 'dark'" (click)="theme.toggle()">
          {{ theme.mode() === 'dark' ? 'Use light mode' : 'Use dark mode' }}
        </button>
      </article>
      <article class="card">
        <h2>Probes</h2>
        <p>
          Checks run on the API process, not in the browser. The dashboard polls the API every 5 seconds.
          Seeded endpoints are public URLs and start with no fabricated history.
        </p>
      </article>
    </section>
  `,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
}
