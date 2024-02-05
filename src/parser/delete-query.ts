import { Delete, From } from 'node-sql-parser';
import { buildExpression, ColumnRef, Expression } from './expression';

export type DeleteOrderBy = ColumnRef & { order: 'ASC' | 'DESC' };

export class DeleteQuery {
  constructor(
    public database: string | null,
    public table: string,
    public alias: string | null,
    public where: Expression | null,
    public orderBy: DeleteOrderBy[],
    public limit: number,
  ) {}

  static fromAst(ast: Delete): DeleteQuery {
    const [{ db, table, as }] = ast.from as From[];
    const orderBy: DeleteOrderBy[] = ((ast as any).orderby || []).map((o) => ({
      ...(buildExpression(o.expr) as ColumnRef),
      order: o.type || 'ASC',
    }));
    const limit = (ast as any).limit?.value.length ? (ast as any).limit?.value[0].value : 0;

    return new DeleteQuery(db, table, as, ast.where ? buildExpression(ast.where) : null, orderBy, limit);
  }
}
