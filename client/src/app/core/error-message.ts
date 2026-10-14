import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: unknown } | null;
    if (body && typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
    if (error.status === 0) {
      return 'The monitoring API is unavailable.';
    }
    return error.message || 'The request failed.';
  }
  return 'The monitoring API is unavailable.';
}
