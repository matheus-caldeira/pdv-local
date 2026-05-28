import { PDVDatabase } from './dexie-database';

let database: PDVDatabase | null = null;

export function getDatabase(): PDVDatabase {
  if (!database) {
    database = new PDVDatabase();
  }
  return database;
}
