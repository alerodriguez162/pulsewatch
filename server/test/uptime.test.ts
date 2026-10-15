import assert from 'node:assert/strict';
import test from 'node:test';

import { averageLatency, uptimePercent } from '../src/uptime.js';

test('returns null uptime and latency when no real samples exist', () => {
  assert.equal(uptimePercent([]), null);
  assert.equal(averageLatency([]), null);
  assert.equal(averageLatency([{ success: false, latencyMs: 1000 }]), null);
});

test('calculates uptime and successful latency from samples', () => {
  const samples = [
    { success: true, latencyMs: 100 },
    { success: false, latencyMs: 800 },
    { success: true, latencyMs: 300 },
  ];
  assert.equal(uptimePercent(samples), 66.7);
  assert.equal(averageLatency(samples), 200);
});
