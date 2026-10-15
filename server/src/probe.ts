import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';

import { ProbeTargetError, resolvePublicTarget, type AddressResolver } from './security/ssrf.js';
import type { HttpMethod, ProbeObservation } from './types.js';

export interface ProbeRequest {
  url: string;
  method: HttpMethod;
  timeoutMs: number;
  expectedStatus: number | null;
}

export async function executeProbe(
  request: ProbeRequest,
  resolve?: AddressResolver,
): Promise<ProbeObservation> {
  let target: { url: URL; address: string };
  try {
    target = await resolvePublicTarget(request.url, resolve);
  } catch (error) {
    const message = error instanceof ProbeTargetError ? error.message : 'Target was rejected.';
    return failure(request.timeoutMs, 'blocked', message);
  }

  const first = await probeOnce(request, target.url, target.address);
  if (first.success || first.errorCategory === 'http' || first.errorCategory === 'too_large' || first.errorCategory === 'blocked') {
    return first;
  }

  try {
    const refreshed = await resolvePublicTarget(request.url, resolve);
    return probeOnce(request, refreshed.url, refreshed.address);
  } catch (error) {
    if (error instanceof ProbeTargetError) {
      return failure(request.timeoutMs, 'blocked', error.message);
    }
    return first;
  }
}

function failure(latencyMs: number, errorCategory: ProbeObservation['errorCategory'], _message: string): ProbeObservation {
  return { success: false, statusCode: null, latencyMs, errorCategory };
}

function probeOnce(request: ProbeRequest, url: URL, address: string): Promise<ProbeObservation> {
  const started = Date.now();
  const transport = url.protocol === 'https:' ? https : http;
  const family = isIP(address) as 4 | 6;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (observation: ProbeObservation) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(observation);
    };
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: request.method,
        timeout: request.timeoutMs,
        servername: url.hostname,
        autoSelectFamily: false,
        headers: {
          host: url.host,
          accept: '*/*',
          'user-agent': 'PulseWatch/1.0',
        },
        lookup: (
          _hostname: string,
          options: { all?: boolean },
          callback: (
            error: NodeJS.ErrnoException | null,
            resolved: string | { address: string; family: number }[],
            resolvedFamily?: number,
          ) => void,
        ) => {
          if (options.all) {
            callback(null, [{ address, family }]);
            return;
          }
          callback(null, address, family);
        },
      } as http.RequestOptions,
      (res) => {
        const statusCode = res.statusCode ?? null;
        const success = isExpected(statusCode, request.expectedStatus);
        finish({
          success,
          statusCode,
          latencyMs: Date.now() - started,
          errorCategory: success ? null : 'http',
        });
        // Status is recorded from the headers. The body is discarded so a large response is not buffered.
        res.destroy();
      },
    );

    req.on('timeout', () => {
      req.destroy();
      finish({ success: false, statusCode: null, latencyMs: Date.now() - started, errorCategory: 'timeout' });
    });
    req.on('error', (error: NodeJS.ErrnoException) => {
      const category = error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' ? 'dns' : 'network';
      finish({ success: false, statusCode: null, latencyMs: Date.now() - started, errorCategory: category });
    });
    req.end();
  });
}

function isExpected(statusCode: number | null, expectedStatus: number | null): boolean {
  if (statusCode === null) {
    return false;
  }
  if (expectedStatus !== null) {
    return statusCode === expectedStatus;
  }
  return statusCode >= 200 && statusCode < 300;
}
