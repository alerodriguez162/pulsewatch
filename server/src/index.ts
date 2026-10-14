import { migrate, openDatabase, seed } from './db.js';
import { createApp } from './http.js';

const databasePath = process.env['PULSEWATCH_DB'] ?? 'data/pulsewatch.sqlite';
const port = Number(process.env['PORT'] ?? 3000);

const db = openDatabase(databasePath);
migrate(db);
seed(db);

const server = createApp(db).listen(port);

function shutdown(): void {
  server.close();
  db.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
