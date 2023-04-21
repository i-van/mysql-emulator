import { Server } from '../server';
import { SelectQuery } from '../parser';
import { extractColumn, extractTable, mapKeys } from '../utils';

export class SelectProcessor {
  protected rows: any[] = [];
  protected columns: string[] = [];

  constructor(protected server: Server, protected query: SelectQuery) {}

  process() {
    this.applyFrom();
    this.applySelect();

    return this.rows;
  }

  private applyFrom(): void {
    if (!this.query.from) {
      return;
    }

    const { databaseName, tableName } = this.query.from;
    const table = this.server.getDatabase(databaseName).getTable(tableName);

    this.columns = table.getColumns().map(c => `${tableName}::${c.getName()}`);
    this.rows = table.getRows().map(r => mapKeys(r, (key) => `${tableName}::${key}`));
  }

  private applySelect() {
    const hasFunctionColumn = this.query.columns.find(c => c.type === 'function');
    if (this.rows.length === 0 && hasFunctionColumn) {
      this.rows = [{}];
    }

    this.rows = this.rows.map((row) => {
      return this.query.columns.reduce((res, c) => {
        if (c.type === 'star') {
          const filter = (key) => c.table ? c.table === extractTable(key) : true;
          return { ...res, ...mapKeys(row, extractColumn, filter) };
        } else if (c.type === 'column_ref') {
          const key = c.table
            ? `${c.table}::${c.column}`
            : Object.keys(row).find(key => extractColumn(key) === c.column);
          if (!key || !this.columns.includes(key)) {
            throw new Error(`Unknown column '${c.column}' in 'field list'`);
          }
          return {
            ...res,
            [c.alias || c.column]: row[key] || null,
          };
        } else if (c.type === 'function') {
          return {
            ...res,
            [c.alias]: this.runFunction(c.name),
          }
        }
        return res;
      }, {});
    });
  }

  private runFunction(name: string) {
    switch (name.toLowerCase()) {
      case 'database': return this.server.getDatabase(null).getName();
      case 'version': return '8.0.0';
      default: throw new Error(`Function ${name} is not implemented`);
    }
  }
}
