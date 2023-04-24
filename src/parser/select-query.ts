import { Select } from 'node-sql-parser';

export type From = {
  databaseName: string | null;
  tableName: string;
  alias: string | null;
};
export type Star = {
  type: 'star';
  table: string | null;
};
export type ColumnRef = {
  type: 'column_ref';
  table: string | null;
  column: string;
  alias: string | null;
};
export type Function = {
  type: 'function';
  name: string;
  alias: string;
};
export type Column = ColumnRef | Function | Star;

export class SelectQuery {
  constructor(
    public from: From | null,
    public columns: Column[],
  ) {}

  static fromAst(ast: Select): SelectQuery {
    const from = ast.from
      ? {
        databaseName: ast.from[0].db,
        tableName: ast.from[0].table,
        alias: ast.from[0].as,
      }
      : null;
    const columns = [...ast.columns].map(c => {
      if ((c.expr as any)?.type === 'function') {
        return {
          type: 'function',
          name: (c.expr as any).name,
          alias: c.as || (c.expr as any).name + '()',
        } as Function;
      } else if (c.expr?.type === 'column_ref' && c.expr.column === '*') {
        return {
          type: 'star',
          table: from && from.alias === c.expr.table ? from.tableName : c.expr.table,
        } as Star;
      } else if (c.expr?.type === 'column_ref') {
        return {
          type: 'column_ref',
          table: from && from.alias === c.expr.table ? from.tableName : c.expr.table,
          column: c.expr.column,
          alias: c.as,
        } as ColumnRef;
      } else if (c === '*') {
        return {
          type: 'star',
          table: null,
        } as Star;
      }
      throw new Error('Could not map columns');
    });

    return new SelectQuery(from, columns);
  }
}
