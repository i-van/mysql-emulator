import { Parser as SqlParser } from 'node-sql-parser';
import { TransactionQuery } from './transaction-query';
import { SelectQuery } from './select-query';
import { ParserException } from './parser-exception';
import { InsertQuery } from './insert-query';
import { CreateTableQuery } from './create-table-query';
import { DropTableQuery } from './drop-table-query';

type Query = TransactionQuery | SelectQuery | InsertQuery | CreateTableQuery | DropTableQuery;

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
        case 'insert': return InsertQuery.fromAst(ast);
        case 'create': return CreateTableQuery.fromAst(ast);
        case 'drop' as unknown: return DropTableQuery.fromAst(ast);
      }
    } catch (err: any) {
      throw new ParserException(`${err.message}: ${injectedSql}`);
    }
    throw new ParserException(`Could not parse sql: ${injectedSql}`);
  }
}
