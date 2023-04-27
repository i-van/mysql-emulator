import { Table } from './table';

export class Database {
  protected tables = new Map<string, Table>();

  constructor(protected name: string) {}

  createTable(name: string): Table {
    if (this.tables.has(name)) {
      throw new Error(`Table ${name} already exists`);
    }

    const table = new Table(name);
    this.tables.set(name, table);
    return table;
  }

  dropTable(name: string): void {
    this.getTable(name);
    this.tables.delete(name);
  }

  getTable(name: string): Table {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(`Unknown ${name} table`);
    }

    return table;
  }

  getName(): string {
    return this.name;
  }
}
