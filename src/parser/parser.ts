import { Parser as SqlParser } from 'node-sql-parser';
import { TransactionQuery } from './transaction-query';
import { SelectQuery } from './select-query';
import { ParserException } from './parser-exception';
import { InsertQuery } from './insert-query';
import { CreateTableQuery } from './create-table-query';
import { DropTableQuery } from './drop-table-query';
import { DeleteQuery } from './delete-query';
import { UpdateQuery } from './update-query';
import { SetQuery } from './set-query';

type Query =
  | TransactionQuery
  | SelectQuery
  | InsertQuery
  | DeleteQuery
  | CreateTableQuery
  | DropTableQuery
  | SetQuery;

const injectParams = (s: string, params: any[]): string => {
  let i = 0;
  return s.replace(/\?/g, () => JSON.stringify(params[i++]));
};

export class Parser {
  private sqlParser = new SqlParser();

  parse(sql: string, params: any[]): Query {
    const injectedSql = injectParams(sql, params);

    const transactionQuery = TransactionQuery.fromSql(injectedSql);
    if (transactionQuery) {
      return transactionQuery;
    }

    let ast = this.sqlParser.astify(injectedSql, { database: 'MariaDB' });
    if (Array.isArray(ast)) {
      if (ast.length === 1) {
        ast = ast[0];
      } else {
        throw new ParserException(`Multi query: ${injectedSql}`);
      }
    }

    try {
      switch (ast.type) {
        case 'select': return SelectQuery.fromAst(ast);
        case 'update': return UpdateQuery.fromAst(ast);
        case 'insert': return InsertQuery.fromAst(ast);
        case 'delete': return DeleteQuery.fromAst(ast);
        case 'create': return CreateTableQuery.fromAst(ast);
        case 'drop' as unknown: return DropTableQuery.fromAst(ast);
        case 'set' as unknown: return SetQuery.fromAst(ast);
      }
    } catch (err: any) {
      throw new ParserException(`${err.message}: ${injectedSql}`);
    }
    throw new ParserException(`Could not parse sql: ${injectedSql}`);
  }
}
