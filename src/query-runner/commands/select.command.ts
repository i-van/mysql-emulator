import { Select } from 'node-sql-parser/types';
import { Server } from '../../server';

export class SelectCommand {
  constructor(protected server: Server) {}

  run(params: Select) {
    const [tableParams] = params.from!;
    const db = this.server.getDatabase(tableParams.db);
    const table = db.getTable(tableParams.table);

    return table.selectRows(params.columns);
  }
}
