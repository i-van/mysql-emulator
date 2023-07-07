import { Parser as SqlParser } from 'node-sql-parser';
import { TransactionQuery } from './transaction-query';
import { SelectQuery } from './select-query';
import { ParserException } from './parser.exception';
import { InsertQuery } from './insert-query';
import { CreateTableQuery } from './create-table-query';
import { DropTableQuery } from './drop-table-query';
import { DeleteQuery } from './delete-query';
import { UpdateQuery } from './update-query';
import { SetQuery } from './set-query';
import { ShowQuery } from './show-query';
import { ReplaceQuery } from './replace-query';

type Query = TransactionQuery | SelectQuery | InsertQuery | DeleteQuery | CreateTableQuery | DropTableQuery | SetQuery;

const injectParams = (s: string, params: any[]): string => {
  let i = 0;
  return s.replace(/\?/g, () => JSON.stringify(params[i++]));
};

export class Parser {
  private sqlParser = new SqlParser();

  parse(sql: string, params: any[]): Query {
    const sqlWithParams = injectParams(sql, params).trim();

    const transactionQuery = TransactionQuery.fromSql(sqlWithParams);
    if (transactionQuery) {
      return transactionQuery;
    }
    const showQuery = ShowQuery.fromSql(sqlWithParams);
    if (showQuery) {
      return showQuery;
    }

    let ast;
    try {
      // replace DEFAULT to __default__ on INSERT and REPLACE queries as
      // node-sql-parser reserves DEFAULT keyword for CREATE TABLE query
      // and cannot be used anywhere else
      const sql = /^(insert|replace)/i.test(sqlWithParams)
        ? sqlWithParams.replace(/default/gi, '__default__')
        : sqlWithParams;
      ast = this.sqlParser.astify(sql, { database: 'MySQL' });
    } catch (err: any) {
      if (err.location) {
        throw new ParserException(`Unexpected token '${err.found}' at line ${err.location.start?.line}`);
      }
      throw err;
    }
    if (Array.isArray(ast)) {
      if (ast.length === 1) {
        ast = ast[0];
      } else {
        throw new ParserException(`Multi query: ${sqlWithParams}`);
      }
    }

    try {
      switch (ast.type) {
        case 'select':
          return SelectQuery.fromAst(ast);
        case 'update':
          return UpdateQuery.fromAst(ast);
        case 'insert':
          return InsertQuery.fromAst(ast);
        case 'replace':
          return ReplaceQuery.fromAst(ast);
        case 'delete':
          return DeleteQuery.fromAst(ast);
        case 'create':
          return CreateTableQuery.fromAst(ast);
        case 'drop' as unknown:
          return DropTableQuery.fromAst(ast);
        case 'set' as unknown:
          return SetQuery.fromAst(ast);
      }
    } catch (err: any) {
      throw new ParserException(`${err.message}: ${sqlWithParams}`);
    }
    throw new ParserException(`Unknown query type '${ast.type}'`);
  }
}
