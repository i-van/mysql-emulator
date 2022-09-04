import { Database } from '../database';

export class Server {
  protected databaseMap = new Map<string, Database>();
  protected usedDatabase: string | null = null;

  createDatabase(name: string) {
    if (this.databaseMap.has(name)) {
      throw new Error(`Database ${name} already exists`);
    }
    this.databaseMap.set(name, new Database(name));
  }

  useDatabase(name: string) {
    if (!this.databaseMap.has(name)) {
      throw new Error(`Unknown database ${name}`);
    }
    this.usedDatabase = name;
  }

  getDatabase(name: string | null): Database {
    if (!name) {
      name = this.usedDatabase;
    }
    if (!name) {
      throw new Error('Database name is empty');
    }

    const db = this.databaseMap.get(name);
    if (!db) {
      throw new Error(`Unknown database ${name}`);
    }

    return db;
  }
}
