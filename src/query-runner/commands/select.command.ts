import { Column, Select } from 'node-sql-parser/types';
import { Server } from '../../server';

export class SelectCommand {
  constructor(protected server: Server) {}

  run(params: Select) {
    if (!params.from) {
      return [
        (params.columns as Column[]).reduce((r, c) => ({
          ...r,
          [c.as || (c.expr as any).name + '()']: this.runFunction((c.expr as any).name),
        }), {}),
      ];
    }
    const [tableParams] = params.from!;
    const db = this.server.getDatabase(tableParams.db);
    const table = db.getTable(tableParams.table);

    return table.selectRows(params.columns);
  }

  private runFunction(name: string) {
    switch (name.toLowerCase()) {
      case 'database': return this.server.getDatabase(null).getName();
      case 'version': return '8.0.0';
      default: throw new Error(`Function ${name} is not implemented`);
    }
  }
}
