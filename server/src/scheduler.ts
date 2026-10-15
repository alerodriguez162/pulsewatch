import { DatabaseSync } from 'node:sqlite';

import { getEndpoint, listDueEndpoints, recordProbe } from './db.js';
import { executeProbe } from './probe.js';
import type { ProbeObservation } from './types.js';

const MAX_CONCURRENCY = 5;

export class ProbeScheduler {
  private timer: NodeJS.Timeout | null = null;
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private readonly queued = new Set<string>();

  constructor(private readonly db: DatabaseSync) {}

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => this.tick(), 1000);
    this.tick();
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  tick(): void {
    for (const endpoint of listDueEndpoints(this.db, new Date().toISOString())) {
      if (this.queued.has(endpoint.id)) {
        continue;
      }
      this.queued.add(endpoint.id);
      void this.run(endpoint.id).finally(() => this.queued.delete(endpoint.id));
    }
  }

  async checkNow(id: string): Promise<ProbeObservation | null> {
    return this.run(id);
  }

  private async run(id: string): Promise<ProbeObservation | null> {
    await this.acquire();
    try {
      const endpoint = getEndpoint(this.db, id);
      if (!endpoint?.enabled) {
        return null;
      }
      const observation = await executeProbe({
        url: endpoint.url,
        method: endpoint.method,
        timeoutMs: endpoint.timeoutMs,
        expectedStatus: endpoint.expectedStatus,
      });
      const current = getEndpoint(this.db, id);
      if (!current) {
        return observation;
      }
      recordProbe(this.db, current, observation);
      return observation;
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < MAX_CONCURRENCY) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next) {
      next();
    }
  }
}
