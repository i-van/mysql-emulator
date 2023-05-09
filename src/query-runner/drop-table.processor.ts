import { Server } from '../server';
import { DropTableQuery } from '../parser';

export class DropTableProcessor {
  constructor(protected server: Server) {}

  process({ database, table, ifExists }: DropTableQuery): void {
    this.server.getDatabase(database).dropTable(table, ifExists);
  }
}
