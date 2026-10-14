import assert from 'node:assert/strict';
import test from 'node:test';

import { isBlockedAddress, resolvePublicTarget } from '../src/security/ssrf.js';

test('blocks private, loopback, link-local, and metadata addresses', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '192.168.0.10', '172.16.0.5', '169.254.169.254', '::1', 'fe80::1']) {
    assert.equal(isBlockedAddress(address), true, address);
  }
  assert.equal(isBlockedAddress('1.1.1.1'), false);
  assert.equal(isBlockedAddress('8.8.8.8'), false);
});

test('rejects non-public targets without using the network', async () => {
  const resolve = async () => ['203.0.113.10'];
  await assert.rejects(() => resolvePublicTarget('http://127.0.0.1/latest', resolve), /not allowed/);
  await assert.rejects(() => resolvePublicTarget('http://localhost/admin', resolve), /not allowed/);
  await assert.rejects(() => resolvePublicTarget('http://169.254.169.254/metadata', resolve), /not allowed/);
  await assert.rejects(() => resolvePublicTarget('file:///etc/passwd', resolve), /http and https/);
  await assert.rejects(() => resolvePublicTarget('http://user:pass@example.com', resolve), /credentials/);
  await assert.rejects(() => resolvePublicTarget('http://example.com', async () => ['10.0.0.5']), /blocked address/);
  await assert.rejects(() => resolvePublicTarget('http://metadata.google.internal/', resolve), /not allowed/);
});

test('accepts a public name when every resolved address is public', async () => {
  const target = await resolvePublicTarget('https://example.com/health', async () => ['93.184.216.34']);
  assert.equal(target.address, '93.184.216.34');
  assert.equal(target.url.hostname, 'example.com');
});
