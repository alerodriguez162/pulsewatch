export function uptimePercent(samples: readonly { success: boolean }[]): number | null {
  if (samples.length === 0) {
    return null;
  }
  const successes = samples.filter((sample) => sample.success).length;
  return Math.round((successes / samples.length) * 1000) / 10;
}

export function averageLatency(
  samples: readonly { success: boolean; latencyMs: number }[],
): number | null {
  const successful = samples.filter((sample) => sample.success);
  if (successful.length === 0) {
    return null;
  }
  const total = successful.reduce((sum, sample) => sum + sample.latencyMs, 0);
  return Math.round(total / successful.length);
}
