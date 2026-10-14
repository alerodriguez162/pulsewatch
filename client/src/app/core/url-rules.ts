import { AbstractControl, ValidationErrors } from '@angular/forms';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google.com',
]);

export function publicHttpUrlError(value: string): 'url' | 'private' | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return 'url';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'url';
  }
  if (url.username || url.password) {
    return 'private';
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (
    !hostname ||
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  ) {
    return 'private';
  }
  if (isIp(hostname)) {
    return isPrivateAddress(hostname) ? 'private' : null;
  }
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) {
    return 'url';
  }
  return null;
}

export function publicHttpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }
  const error = publicHttpUrlError(value);
  if (error === 'private') {
    return { privateNetwork: true };
  }
  if (error === 'url') {
    return { url: true };
  }
  return null;
}

function isIp(hostname: string): boolean {
  return hostname.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address === '::' || address.toLowerCase().startsWith('fe80:') || address.toLowerCase().startsWith('fc') || address.toLowerCase().startsWith('fd')) {
    return true;
  }
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === undefined || b === undefined) {
    return true;
  }
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}
