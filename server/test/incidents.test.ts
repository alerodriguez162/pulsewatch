import assert from 'node:assert/strict';
import test from 'node:test';

import { decideIncidents } from '../src/incidents.js';

const thresholds = { failureThreshold: 2, latencyThresholdMs: 500 };

test('opens a failure incident after consecutive failures and closes it on recovery', () => {
  const first = decideIncidents(
    { failure: false, latency: false, consecutiveFailures: 0 },
    { success: false, latencyMs: 20, errorCategory: 'timeout' },
    thresholds,
  );
  assert.deepEqual(first.open, []);
  assert.equal(first.consecutiveFailures, 1);

  const second = decideIncidents(
    { failure: false, latency: false, consecutiveFailures: first.consecutiveFailures },
    { success: false, latencyMs: 5000, errorCategory: 'timeout' },
    thresholds,
  );
  assert.deepEqual(second.open, ['failure']);

  const recovered = decideIncidents(
    { failure: true, latency: false, consecutiveFailures: second.consecutiveFailures },
    { success: true, latencyMs: 40, errorCategory: null },
    thresholds,
  );
  assert.deepEqual(recovered.resolve, ['failure']);
  assert.equal(recovered.consecutiveFailures, 0);
});

test('opens and closes a latency incident only for completed responses', () => {
  const slow = decideIncidents(
    { failure: false, latency: false, consecutiveFailures: 0 },
    { success: true, latencyMs: 900, errorCategory: null },
    thresholds,
  );
  assert.deepEqual(slow.open, ['latency']);

  const timeout = decideIncidents(
    { failure: false, latency: false, consecutiveFailures: 0 },
    { success: false, latencyMs: 5000, errorCategory: 'timeout' },
    thresholds,
  );
  assert.deepEqual(timeout.open, []);

  const recovered = decideIncidents(
    { failure: false, latency: true, consecutiveFailures: 0 },
    { success: true, latencyMs: 100, errorCategory: null, statusCode: 200 },
    thresholds,
  );
  assert.deepEqual(recovered.resolve, ['latency']);
});
