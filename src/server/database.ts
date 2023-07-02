import { Table } from './table';
import { ServerException } from './server.exception';

export class Database {
  protected tables = new Map<string, Table>();
  protected snapshots = new Map<string, object[]>();

  constructor(protected name: string) {}

  createTable(name: string): Table {
    if (this.tables.has(name)) {
      throw new ServerException({
        message: `Table '${name}' already exists`,
        code: 'TABLE_EXISTS',
      });
    }

    const table = new Table(name);
    this.tables.set(name, table);
    return table;
  }

  dropTable(name: string, skipIfNotExists = false): void {
    const deleted = this.tables.delete(name);
    if (!deleted && !skipIfNotExists) {
      throw new ServerException({
        message: `Unknown table '${this.name}.${name}'`,
        code: 'UNKNOWN_TABLE',
      });
    }
  }

  getTable(name: string): Table {
    const table = this.tables.get(name);
    if (!table) {
      throw new ServerException({
        message: `Table '${this.name}.${name}' doesn't exist`,
        code: 'TABLE_DOES_NOT_EXIST',
      });
    }

    return table;
  }

  getTableNames(): string[] {
    const names: string[] = [];
    this.tables.forEach((t) => {
      names.push(t.getName());
    });

    return names;
  }

  getName(): string {
    return this.name;
  }

  snapshot(): void {
    this.tables.forEach((t) => {
      this.snapshots.set(t.getName(), [...t.getRows().values()]);
    });
  }

  hasSnapshot(): boolean {
    return this.snapshots.size > 0;
  }

  restoreSnapshot(): void {
    this.snapshots.forEach((rows, tableName) => {
      this.getTable(tableName).setRows(rows);
    });
    this.deleteSnapshot();
  }

  deleteSnapshot(): void {
    this.snapshots = new Map<string, object[]>();
  }
}
