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
  ShowQuery,
  TransactionQuery,
  UpdateQuery,
} from '../parser';
import { InsertProcessor } from './insert.processor';
import { DropTableProcessor } from './drop-table.processor';
import { DeleteProcessor } from './delete.processor';
import { UpdateProcessor } from './update.processor';
import { ShowProcessor } from './show.processor';
import { TransactionProcessor } from './transaction.processor';

export class Processor {
  protected parser = new Parser();

  constructor(protected server: Server) {}

  async process(sql: string, params: any[]): Promise<any> {
    const query = this.parser.parse(sql, params);
    if (query instanceof TransactionQuery) {
      const p = new TransactionProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof ShowQuery) {
      const p = new ShowProcessor(this.server);
      return p.process(query);
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
