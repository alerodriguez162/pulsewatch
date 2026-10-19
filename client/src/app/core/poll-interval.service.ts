import { Injectable, signal } from '@angular/core';

export const POLL_INTERVALS_MS = [5000, 10000, 30000] as const;

export type PollIntervalMs = (typeof POLL_INTERVALS_MS)[number];

const STORAGE_KEY = 'pulsewatch-poll-ms';

@Injectable({ providedIn: 'root' })
export class PollIntervalService {
  readonly intervalMs = signal<PollIntervalMs>(readPollInterval());

  set(value: number): void {
    if (!isPollInterval(value)) {
      return;
    }
    this.intervalMs.set(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }
}

export function isPollInterval(value: number): value is PollIntervalMs {
  return (POLL_INTERVALS_MS as readonly number[]).includes(value);
}

function readPollInterval(): PollIntervalMs {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return isPollInterval(stored) ? stored : 5000;
}
