import { From, Update } from 'node-sql-parser';
import { buildExpression, ColumnRef, Expression } from './expression';

export type Assignment = {
  table: string | null;
  column: string;
  value: Expression;
};

export type UpdateOrderBy = ColumnRef & { order: 'ASC' | 'DESC' };

export class UpdateQuery {
  constructor(
    public database: string | null,
    public table: string,
    public alias: string | null,
    public assignments: Assignment[],
    public where: Expression | null,
    public orderBy: UpdateOrderBy[],
    public limit: number,
  ) {}

  static fromAst(ast: Update): UpdateQuery {
    const [{ db, table, as }] = ast.table as From[];
    const assignments: Assignment[] = ast.set.map((s) => ({
      table: s.table,
      column: s.column,
      value: buildExpression(s.value),
    }));
    const orderBy: UpdateOrderBy[] = ((ast as any).orderby || []).map((o) => ({
      ...(buildExpression(o.expr) as ColumnRef),
      order: o.type || 'ASC',
    }));
    const limit = (ast as any).limit?.value.length ? (ast as any).limit?.value[0].value : 0;

    return new UpdateQuery(db, table, as, assignments, ast.where ? buildExpression(ast.where) : null, orderBy, limit);
  }
}
