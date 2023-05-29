import { Table } from './table';
import { ServerError } from './server-error';

export class Database {
  protected tables = new Map<string, Table>();

  constructor(protected name: string) {}

  createTable(name: string): Table {
    if (this.tables.has(name)) {
      throw new ServerError({
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
      throw new ServerError({
        message: `Unknown table '${this.name}.${name}'`,
        code: 'UNKNOWN_TABLE',
      });
    }
  }

  getTable(name: string): Table {
    const table = this.tables.get(name);
    if (!table) {
      throw new ServerError({
        message: `Table '${this.name}.${name}' doesn't exist`,
        code: 'TABLE_DOES_NOT_EXIST',
      });
    }

    return table;
  }

  getName(): string {
    return this.name;
  }
}
