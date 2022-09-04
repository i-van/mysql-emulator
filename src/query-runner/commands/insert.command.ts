import { Insert_Replace } from 'node-sql-parser/types';
import { Server } from '../../server';

const buildRow = (keys: any[], values: any[]) => keys.reduce((object, key, index) => ({
  ...object,
  [key]: values[index],
}), {});

export class InsertCommand {
  constructor(protected server: Server) {}

  run(params: Insert_Replace) {
    const [tableParams] = params.table!;
    const db = this.server.getDatabase(tableParams.db);
    const table = db.getTable(tableParams.table);

    for (const { value } of params.values) {
      table.insertRow(buildRow(params.columns!, value.map(i => i.value)));
    }
  }
}
