import { FormControl, FormGroup, Validators } from '@angular/forms';

import type { Endpoint, EndpointDraft, HttpMethod } from './models';
import { publicHttpUrlValidator } from './url-rules';

export interface EndpointFormValue {
  name: string;
  url: string;
  method: HttpMethod;
  timeoutSeconds: number;
  intervalSeconds: number;
  expectedStatus: number | null;
  latencyThresholdMs: number;
  failureThreshold: number;
  enabled: boolean;
}

export function createEndpointForm(): FormGroup {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2048), publicHttpUrlValidator],
    }),
    method: new FormControl<HttpMethod>('GET', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    timeoutSeconds: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(30)],
    }),
    intervalSeconds: new FormControl(60, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(15), Validators.max(86400)],
    }),
    expectedStatus: new FormControl<number | null>(null, {
      validators: [Validators.min(100), Validators.max(599)],
    }),
    latencyThresholdMs: new FormControl(800, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(50), Validators.max(60000)],
    }),
    failureThreshold: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(20)],
    }),
    enabled: new FormControl(true, { nonNullable: true }),
  });
}

export function toFormValue(endpoint: Endpoint): EndpointFormValue {
  return {
    name: endpoint.name,
    url: endpoint.url,
    method: endpoint.method,
    timeoutSeconds: endpoint.timeoutMs / 1000,
    intervalSeconds: endpoint.intervalMs / 1000,
    expectedStatus: endpoint.expectedStatus,
    latencyThresholdMs: endpoint.latencyThresholdMs,
    failureThreshold: endpoint.failureThreshold,
    enabled: endpoint.enabled,
  };
}

export function toDraft(value: EndpointFormValue): EndpointDraft {
  const expected = value.expectedStatus;
  return {
    name: value.name.trim(),
    url: value.url.trim(),
    method: value.method,
    timeoutMs: Math.round(Number(value.timeoutSeconds) * 1000),
    intervalMs: Math.round(Number(value.intervalSeconds) * 1000),
    expectedStatus: expected === null || expected === undefined || String(expected) === '' ? null : Number(expected),
    latencyThresholdMs: Number(value.latencyThresholdMs),
    failureThreshold: Number(value.failureThreshold),
    enabled: value.enabled,
  };
}
