export function formatPercent(value: number | null): string {
  return value === null ? 'No data' : `${value.toFixed(1)}%`;
}

export function formatLatency(value: number | null): string {
  return value === null ? 'No data' : `${value} ms`;
}

export function formatTime(value: string | null): string {
  if (!value) {
    return 'Not checked';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
