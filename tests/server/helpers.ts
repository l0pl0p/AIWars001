import Database from 'better-sqlite3';
import { createSchema } from '../../server/src/db/schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createSchema(db);
  return db;
}
