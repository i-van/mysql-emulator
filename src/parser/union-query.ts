import { Select } from 'node-sql-parser';
import { buildExpression, ColumnRef } from './expression';
import { OrderBy, SelectQuery } from './select-query';

export class UnionQuery {
  constructor(
    public selects: SelectQuery[],
    public distinct: boolean,
    public orderBy: OrderBy[],
    public limit: number,
  ) {}

  static fromAst(ast: Select): UnionQuery {
    const selects: SelectQuery[] = [];
    const unions: string[] = [];
    let current = ast;
    while (current) {
      const select = SelectQuery.fromAst(current);
      selects.push(select);
      unions.push((current as any).set_op);
      current = (current as any)._next as Select;
    }
    const orderBy: OrderBy[] = (ast._orderby || []).map((o) => ({
      ...(buildExpression(o.expr) as ColumnRef),
      order: o.type || 'ASC',
    }));
    const limit = ast._limit?.value.length ? ast._limit?.value[0].value : 0;

    return new UnionQuery(
      selects,
      unions.some((u) => ['union', 'union distinct'].includes(u)),
      orderBy,
      limit,
    );
  }
}
