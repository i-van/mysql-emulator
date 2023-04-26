import { Server } from '../server';
import { InsertQuery } from '../parser';

export class InsertProcessor {
  constructor(protected server: Server) {}

  process(query: InsertQuery) {
    const db = this.server.getDatabase(query.database);
    const table = db.getTable(query.table);

    for (const row of query.rows) {
      table.insertRow(row);
    }
  }
}
