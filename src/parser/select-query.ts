import { Select } from 'node-sql-parser';
import { buildExpression, ColumnRef, Expression, FunctionType, Star } from './expression';

export type From = {
  database: string | null;
  table: string;
  join: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | null;
  on: Expression | null;
};

type WithAlias<T> = T & { alias: string | null };
export type Column = WithAlias<ColumnRef> | WithAlias<FunctionType> | Star;
export type OrderBy = ColumnRef & { order: 'ASC' | 'DESC' };

export class SelectQuery {
  constructor(
    public from: From[],
    public columns: Column[],
    public where: Expression | null,
    public groupBy: ColumnRef[],
    public orderBy: OrderBy[],
  ) {}

  static fromAst(ast: Select): SelectQuery {
    const tableAliases = new Map<string, string>();
    (ast.from || []).forEach(f => f.as && tableAliases.set(f.as, f.table));
    const from = (ast.from || []).map(f => ({
      database: f.database || null,
      table: f.table,
      join: f.join || null,
      on: f.on ? buildExpression(f.on, tableAliases) : null,
    }));

    const columns = [...ast.columns].map((c): Column => {
      if (c === '*') {
        return buildExpression({ type: 'star', value: c }, tableAliases) as Star;
      } else if (c.expr?.type === 'column_ref' && c.expr.column === '*') {
        return buildExpression(c.expr, tableAliases) as Star;
      } else if (['column_ref', 'aggr_func', 'function'].includes(c.expr?.type)) {
        return {
          ...buildExpression(c.expr, tableAliases) as ColumnRef | FunctionType,
          alias: c.as,
        };
      }
      throw new Error('Could not map columns');
    });
    const groupBy: ColumnRef[] = (ast.groupby || []).map(g => (
      buildExpression(g, tableAliases) as ColumnRef
    ));
    const orderBy: OrderBy[] = (ast.orderby || []).map(o => ({
      ...buildExpression(o.expr, tableAliases),
      order: o.type,
    } as OrderBy));

    return new SelectQuery(
      from,
      columns,
      ast.where ? buildExpression(ast.where, tableAliases) : null,
      groupBy,
      orderBy,
    );
  }
}
