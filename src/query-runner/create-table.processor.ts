import { Server } from '../server';
import { CreateTableQuery } from '../parser';

export class CreateTableProcessor {
  constructor(protected server: Server) {}

  process(query: CreateTableQuery): void {
    const db = this.server.getDatabase(query.databaseName);
    const table = db.createTable(query.tableName);

    for (const column of query.columns) {
      table.addColumn(column.name, column.dataType);
    }
  }
}
