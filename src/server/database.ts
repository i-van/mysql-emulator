import { Table } from './table';

export class Database {
  protected tableMap = new Map<string, Table>();

  constructor(protected name: string) {}

  createTable(name: string): Table {
    if (this.tableMap.has(name)) {
      throw new Error(`Table ${name} already exists`);
    }

    const table = new Table(name);
    this.tableMap.set(name, table);
    return table;
  }

  getTable(name: string): Table {
    const table = this.tableMap.get(name);
    if (!table) {
      throw new Error(`Unknown ${name} table`);
    }

    return table;
  }

  getName(): string {
    return this.name;
  }
}
