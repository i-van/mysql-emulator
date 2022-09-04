import { Parser } from 'node-sql-parser';
import { Server } from '../server';
import { CreateTableCommand } from './commands/create-table.command';
import { InsertCommand } from './commands/insert.command';
import { SelectCommand } from './commands/select.command';

const injectParams = (s: string, params: any[]): string => {
  let i = 0;
  return s.replace(/\?/g, () => params[i++]);
};

export class QueryRunner {
  protected parser = new Parser();

  constructor(protected server: Server) {}

  async query(sql: string, params: any[]): Promise<any> {
    let ast = this.parser.astify(injectParams(sql, params));
    if (Array.isArray(ast)) {
      if (ast.length === 1) {
        ast = ast[0];
      } else {
        throw new Error('Multi query');
      }
    }
    if (ast.type === 'create' && ast.keyword === 'table') {
      const command = new CreateTableCommand(this.server);
      return command.run(ast);
    }
    if (ast.type === 'insert') {
      const command = new InsertCommand(this.server);
      return command.run(ast);
    }
    if (ast.type === 'select') {
      const command = new SelectCommand(this.server);
      return command.run(ast);
    }

    throw new Error(`Cannot handle query: ${sql}`);
  }
}
