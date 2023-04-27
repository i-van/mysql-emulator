import { Database } from './database';

export class Server {
  protected databases = new Map<string, Database>();
  protected usedDatabase: string | null = null;

  constructor(databaseName = 'primary') {
    const infoDb = this.createDatabase('INFORMATION_SCHEMA')
    infoDb.createTable('TABLES');
    infoDb.createTable('COLUMNS');
    this.createDatabase(databaseName);
    this.useDatabase(databaseName);
  }

  createDatabase(name: string): Database {
    if (this.databases.has(name)) {
      throw new Error(`Database ${name} already exists`);
    }
    const db = new Database(name);
    this.databases.set(name, db);
    return db;
  }

  useDatabase(name: string) {
    if (!this.databases.has(name)) {
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

    const db = this.databases.get(name);
    if (!db) {
      throw new Error(`Unknown database ${name}`);
    }

    return db;
  }
}
