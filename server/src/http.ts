import express, { type NextFunction, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { ZodError } from 'zod';

import { createEndpoint, dashboard, deleteEndpoint, getEndpoint, listEndpoints, updateEndpoint } from './db.js';
import { ProbeTargetError, resolvePublicTarget } from './security/ssrf.js';
import { endpointDraftSchema } from './validation.js';

export function createApp(db: DatabaseSync) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/dashboard', (_req, res) => {
    res.json({
      endpoints: dashboard(db),
      recentIncidents: [],
      generatedAt: new Date().toISOString(),
    });
  });

  app.get('/api/endpoints', (_req, res) => {
    res.json(listEndpoints(db));
  });

  app.post('/api/endpoints', async (req, res, next) => {
    try {
      const draft = await parseDraft(req.body);
      res.status(201).json(createEndpoint(db, draft));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/endpoints/:id', (req, res) => {
    const endpoint = getEndpoint(db, req.params.id);
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found.' });
      return;
    }
    res.json(endpoint);
  });

  app.patch('/api/endpoints/:id', async (req, res, next) => {
    try {
      const existing = getEndpoint(db, req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Endpoint not found.' });
        return;
      }
      const draft = await parseDraft({ ...existing, ...req.body });
      res.json(updateEndpoint(db, existing.id, draft));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/endpoints/:id', (req, res) => {
    if (!deleteEndpoint(db, req.params.id)) {
      res.status(404).json({ error: 'Endpoint not found.' });
      return;
    }
    res.status(204).send();
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request.' });
      return;
    }
    if (error instanceof ProbeTargetError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

async function parseDraft(body: unknown) {
  const draft = endpointDraftSchema.parse(body);
  await resolvePublicTarget(draft.url);
  return draft;
}
