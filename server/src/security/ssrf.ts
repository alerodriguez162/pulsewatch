import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google.com',
]);

const blockList = new BlockList();
blockList.addSubnet('0.0.0.0', 8, 'ipv4');
blockList.addSubnet('10.0.0.0', 8, 'ipv4');
blockList.addSubnet('100.64.0.0', 10, 'ipv4');
blockList.addSubnet('127.0.0.0', 8, 'ipv4');
blockList.addSubnet('169.254.0.0', 16, 'ipv4');
blockList.addSubnet('172.16.0.0', 12, 'ipv4');
blockList.addSubnet('192.0.0.0', 24, 'ipv4');
blockList.addSubnet('192.0.2.0', 24, 'ipv4');
blockList.addSubnet('192.168.0.0', 16, 'ipv4');
blockList.addSubnet('198.18.0.0', 15, 'ipv4');
blockList.addSubnet('198.51.100.0', 24, 'ipv4');
blockList.addSubnet('203.0.113.0', 24, 'ipv4');
blockList.addSubnet('224.0.0.0', 4, 'ipv4');
blockList.addAddress('255.255.255.255', 'ipv4');
blockList.addAddress('::', 'ipv6');
blockList.addAddress('::1', 'ipv6');
blockList.addSubnet('fc00::', 7, 'ipv6');
blockList.addSubnet('fe80::', 10, 'ipv6');
blockList.addSubnet('2001:db8::', 32, 'ipv6');
blockList.addSubnet('ff00::', 8, 'ipv6');

export class ProbeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProbeTargetError';
  }
}

export type AddressResolver = (hostname: string) => Promise<string[]>;

export function isBlockedAddress(address: string): boolean {
  const mapped = address.toLowerCase().startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
  if (!isIP(mapped)) {
    return true;
  }
  const family = mapped.includes(':') ? 'ipv6' : 'ipv4';
  return blockList.check(mapped, family);
}

export async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export async function resolvePublicTarget(
  rawUrl: string,
  resolve: AddressResolver = defaultResolve,
): Promise<{ url: URL; address: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProbeTargetError('URL is not valid.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ProbeTargetError('Only http and https URLs can be monitored.');
  }
  if (url.username || url.password) {
    throw new ProbeTargetError('URLs must not include credentials.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new ProbeTargetError('This host is not allowed.');
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new ProbeTargetError('Private, loopback, and link-local addresses are not allowed.');
    }
    return { url, address: hostname };
  }

  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) {
    throw new ProbeTargetError('Hostname is not a public DNS name.');
  }

  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    throw new ProbeTargetError('DNS lookup failed.');
  }
  if (addresses.length === 0 || addresses.some((address) => isBlockedAddress(address))) {
    throw new ProbeTargetError('DNS resolved to a blocked address.');
  }

  const address = addresses[0];
  if (!address) {
    throw new ProbeTargetError('DNS resolved to a blocked address.');
  }
  return { url, address };
}
