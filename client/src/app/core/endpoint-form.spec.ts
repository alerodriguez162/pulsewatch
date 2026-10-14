import { createEndpointForm, toDraft } from './endpoint-form';

describe('endpoint form', () => {
  it('requires a public URL and bounded timing values', () => {
    const form = createEndpointForm();
    form.controls['name']?.setValue('');
    form.controls['url']?.setValue('http://127.0.0.1');
    form.controls['intervalSeconds']?.setValue(1);
    expect(form.invalid).toBe(true);
    expect(form.controls['url']?.hasError('privateNetwork')).toBe(true);
    expect(form.controls['intervalSeconds']?.hasError('min')).toBe(true);
  });

  it('converts seconds to milliseconds in the API draft', () => {
    const form = createEndpointForm();
    form.setValue({
      name: 'Example',
      url: 'https://example.com',
      method: 'GET',
      timeoutSeconds: 5,
      intervalSeconds: 60,
      expectedStatus: null,
      latencyThresholdMs: 800,
      failureThreshold: 2,
      enabled: true,
    });
    expect(toDraft(form.getRawValue())).toEqual({
      name: 'Example',
      url: 'https://example.com',
      method: 'GET',
      timeoutMs: 5000,
      intervalMs: 60000,
      expectedStatus: null,
      latencyThresholdMs: 800,
      failureThreshold: 2,
      enabled: true,
    });
  });
});
