import { Server } from '../server';
import { Function, SelectQuery } from '../parser';

export class SelectProcessor {
  constructor(protected server: Server) {}

  process(query: SelectQuery) {
    if (!query.from) {
      return [
        (query.columns as Function[]).reduce((r, c) => ({
          ...r,
          [c.alias]: this.runFunction(c.name),
        }), {}),
      ];
    }

    const db = this.server.getDatabase(query.from.databaseName);
    const table = db.getTable(query.from.tableName);
    const rows = table.getRows();

    return rows.map((row) => {
      return query.columns.reduce((r, c) => {
        if (c.type === 'star') {
          return { ...r, ...row };
        } else if (c.type === 'column_ref') {
          return {
            ...r,
            [c.alias || c.column]: row[c.column],
          };
        } else if (c.type === 'function') {
          // todo: handle it
          return r;
        }
        return r;
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
