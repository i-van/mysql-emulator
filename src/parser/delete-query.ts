import { Delete, From } from 'node-sql-parser';
import { buildExpression, Expression } from './expression';

export class DeleteQuery {
  constructor(
    public database: string | null,
    public table: string,
    public where: Expression | null,
  ) {}

  static fromAst(ast: Delete): DeleteQuery {
    const [{ db, table, as }] = ast.from as From[];
    const tableAliases = new Map<string, string>();
    as && tableAliases.set(as, table);

    return new DeleteQuery(
      db,
      table,
      ast.where ? buildExpression(ast.where, tableAliases) : null,
    );
  }
}
