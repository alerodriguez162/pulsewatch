import express, { type NextFunction, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { ZodError } from 'zod';

import {
  createEndpoint,
  dashboard,
  deleteEndpoint,
  getEndpoint,
  listEndpoints,
  listHistory,
  listIncidents,
  updateEndpoint,
} from './db.js';
import type { ProbeScheduler } from './scheduler.js';
import { ProbeTargetError, resolvePublicTarget } from './security/ssrf.js';
import { endpointDraftSchema } from './validation.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createApp(db: DatabaseSync, scheduler: ProbeScheduler) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/dashboard', (_req, res) => {
    res.json({
      endpoints: dashboard(db),
      recentIncidents: listIncidents(db).slice(0, 8),
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
      const updated = updateEndpoint(db, existing.id, draft);
      res.json(updated);
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

  app.get('/api/endpoints/:id/history', (req, res) => {
    if (!getEndpoint(db, req.params.id)) {
      res.status(404).json({ error: 'Endpoint not found.' });
      return;
    }
    const since = new Date(Date.now() - DAY_MS).toISOString();
    res.json(listHistory(db, req.params.id, since));
  });

  app.post('/api/endpoints/:id/check', async (req, res, next) => {
    try {
      const observation = await scheduler.checkNow(req.params.id);
      if (!observation) {
        res.status(404).json({ error: 'Endpoint not found or paused.' });
        return;
      }
      res.json(observation);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/incidents', (req, res) => {
    const endpointId = typeof req.query['endpointId'] === 'string' ? req.query['endpointId'] : undefined;
    res.json(listIncidents(db, endpointId));
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
