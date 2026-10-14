import { z } from 'zod';

export const endpointDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().max(2048),
  method: z.enum(['GET', 'HEAD', 'POST']),
  timeoutMs: z.number().int().min(1000).max(30_000),
  intervalMs: z.number().int().min(15_000).max(86_400_000),
  expectedStatus: z.number().int().min(100).max(599).nullable(),
  latencyThresholdMs: z.number().int().min(50).max(60_000),
  failureThreshold: z.number().int().min(1).max(20),
  enabled: z.boolean(),
});

export type EndpointDraftInput = z.infer<typeof endpointDraftSchema>;
