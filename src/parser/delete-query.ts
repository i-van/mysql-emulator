import { Delete, From } from 'node-sql-parser';
import { buildExpression, Expression } from './expression';

export class DeleteQuery {
  constructor(
    public database: string | null,
    public table: string,
    public alias: string | null,
    public where: Expression | null,
  ) {}

  static fromAst(ast: Delete): DeleteQuery {
    const [{ db, table, as }] = ast.from as From[];

    return new DeleteQuery(
      db,
      table,
      as,
      ast.where ? buildExpression(ast.where) : null,
    );
  }
}
