import { migrate, openDatabase, seed } from './db.js';
import { createApp } from './http.js';
import { ProbeScheduler } from './scheduler.js';

const databasePath = process.env['PULSEWATCH_DB'] ?? 'data/pulsewatch.sqlite';
const port = Number(process.env['PORT'] ?? 3000);

const db = openDatabase(databasePath);
migrate(db);
seed(db);

const scheduler = new ProbeScheduler(db);
scheduler.start();

const server = createApp(db, scheduler).listen(port);

function shutdown(): void {
  scheduler.stop();
  server.close();
  db.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
