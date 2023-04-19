import { Server } from '../server';
import { CreateTableProcessor } from './create-table.processor';
import { SelectProcessor } from './select.processor';
import { CreateTableQuery, InsertQuery, Parser, SelectQuery, TransactionQuery } from '../parser';
import { InsertProcessor } from './insert.processor';

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
      const p = new SelectProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof InsertQuery) {
      const p = new InsertProcessor(this.server);
      return p.process(query);
    }
    if (query instanceof CreateTableQuery) {
      const p = new CreateTableProcessor(this.server);
      return p.process(query);
    }

    throw new Error(`Cannot handle query: ${sql}`);
  }
}
