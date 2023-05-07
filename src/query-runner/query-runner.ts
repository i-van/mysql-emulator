import { Server } from '../server';
import { CreateTableProcessor } from './create-table.processor';
import { SelectProcessor } from './select.processor';
import {
  CreateTableQuery,
  DeleteQuery,
  DropTableQuery,
  InsertQuery,
  Parser,
  SelectQuery,
  SetQuery,
  TransactionQuery,
  UpdateQuery,
} from '../parser';
import { InsertProcessor } from './insert.processor';
import { DropTableProcessor } from './drop-table.processor';
import { DeleteProcessor } from './delete.processor';
import { UpdateProcessor } from './update.processor';

export class QueryRunner {
  protected parser = new Parser();

  constructor(protected server: Server) {}

  async query(sql: string, params: any[]): Promise<any> {
    const query = this.parser.parse(sql, params);
    if (query instanceof TransactionQuery) {
      // todo: handle it
      return;
    }
    if (query instanceof SelectQuery) {
      const p = new SelectProcessor(this.server, query);
      return p.process();
    }
    if (query instanceof UpdateQuery) {
      const p = new UpdateProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof InsertQuery) {
      const p = new InsertProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof DeleteQuery) {
      const p = new DeleteProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof CreateTableQuery) {
      const p = new CreateTableProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof DropTableQuery) {
      const p = new DropTableProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof SetQuery) {
      // todo: handle it
      return;
    }

    throw new Error(`Cannot handle query: ${sql}`);
  }
}
