import { Injectable, effect, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'pulsewatch-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(readTheme());

  constructor() {
    effect(() => {
      const dark = this.mode() === 'dark';
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem(STORAGE_KEY, this.mode());
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }
}

function readTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
