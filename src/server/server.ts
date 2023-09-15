import { Database } from './database';
import { ServerException } from './server.exception';
import { StringColumn } from './columns';

export class Server {
  protected databases = new Map<string, Database>();
  protected usedDatabase: string | null = null;

  constructor(databaseName = 'primary') {
    const infoDb = this.createDatabase('INFORMATION_SCHEMA');
    infoDb.createTable('TABLES');
    infoDb.createTable('KEY_COLUMN_USAGE');
    const columnsTable = infoDb.createTable('COLUMNS');
    columnsTable.addColumn(new StringColumn('TABLE_SCHEMA', false, null, 255));
    columnsTable.addColumn(new StringColumn('TABLE_NAME', false, null, 255));
    this.createDatabase(databaseName);
    this.useDatabase(databaseName);
  }

  createDatabase(name: string): Database {
    if (this.databases.has(name)) {
      throw new ServerException({
        message: `Database ${name} already exists`,
        code: 'DATABASE_EXISTS',
      });
    }
    const db = new Database(name);
    this.databases.set(name, db);
    return db;
  }

  useDatabase(name: string) {
    if (!this.databases.has(name)) {
      throw new ServerException({
        message: `Unknown database ${name}`,
        code: 'UNKNOWN_DATABASE',
      });
    }
    this.usedDatabase = name;
  }

  getDatabase(name: string | null): Database {
    if (!name) {
      name = this.usedDatabase;
    }
    if (!name) {
      throw new ServerException({
        message: 'Database name is empty',
        code: 'EMPTY_DATABASE',
      });
    }

    const db = this.databases.get(name);
    if (!db) {
      throw new ServerException({
        message: `Unknown database ${name}`,
        code: 'UNKNOWN_DATABASE',
      });
    }

    return db;
  }

  getDatabaseNames(): string[] {
    const names: string[] = [];
    this.databases.forEach((db) => {
      names.push(db.getName());
    });

    return names;
  }
}
