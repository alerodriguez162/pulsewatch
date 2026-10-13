import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#main">Skip to content</a>
    <header class="topbar">
      <a class="brand" routerLink="/">PulseWatch</a>
      <nav aria-label="Primary">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
        <a routerLink="/endpoints" routerLinkActive="active">Endpoints</a>
        <a routerLink="/analytics" routerLinkActive="active">Analytics</a>
        <a routerLink="/alerts" routerLinkActive="active">Alerts</a>
        <a routerLink="/settings" routerLinkActive="active">Settings</a>
      </nav>
      <button type="button" [attr.aria-pressed]="theme.mode() === 'dark'" (click)="theme.toggle()">
        {{ theme.mode() === 'dark' ? 'Light mode' : 'Dark mode' }}
      </button>
    </header>
    <main id="main">
      <router-outlet />
    </main>
  `,
})
export class Shell {
  readonly theme = inject(ThemeService);
}
