import { Server } from '../server';
import { CreateTableQuery } from '../parser';

export class CreateTableProcessor {
  constructor(protected server: Server) {}

  process(query: CreateTableQuery): void {
    const db = this.server.getDatabase(query.database);
    const table = db.createTable(query.table);

    for (const column of query.columns) {
      table.addColumn(column.name, column.dataType);
    }
  }
}
