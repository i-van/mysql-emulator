import { Create } from 'node-sql-parser/types';
import { Server } from '../../server';
import { DataType } from '../../table/table-column';

type Column = {
  column: {
    column: string;
  };
  definition: {
    dataType: DataType;
  };
};

export class CreateTableCommand {
  constructor(protected server: Server) {}

  run(params: Create) {
    const [tableParams] = params.table!;
    const db = this.server.getDatabase(tableParams.db);
    const table = db.createTable(tableParams.table);

    for (const c of params.create_definitions as Column[]) {
      table.addColumn(c.column.column, c.definition.dataType);
    }
  }
}
