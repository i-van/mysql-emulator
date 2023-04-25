import { Select } from 'node-sql-parser';

type WithAlias<T> = T & { alias: string };
type WithNullableAlias<T> = T & { alias: string | null };

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
};
export type FunctionType = {
  type: 'function';
  name: string;
  // todo: add args
};
export type NumberType = {
  type: 'number';
  value: number;
};
export type StringType = {
  type: 'string';
  value: string;
};
export type ArrayType = {
  type: 'array';
  value: (string | number)[];
};
export type Column = WithNullableAlias<ColumnRef> | WithAlias<FunctionType> | Star;
export type UnaryExpression = {
  type: 'unary_expression';
  operator: string;
  expression: Expression;
}
export type BinaryExpression = {
  type: 'binary_expression';
  operator: string;
  left: Expression;
  right: Expression;
}
export type Expression = UnaryExpression | BinaryExpression | ColumnRef | FunctionType | NumberType | StringType | ArrayType;
export type OrderBy = ColumnRef & { order: 'ASC' | 'DESC' };

const buildExpression = (ast: any, tableAliases: Map<string, string>): Expression => {
  if (ast.type === 'unary_expr') {
    return {
      type: 'unary_expression',
      operator: ast.operator,
      expression: buildExpression(ast.expr, tableAliases),
    };
  }
  if (ast.type === 'binary_expr') {
    return {
      type: 'binary_expression',
      operator: ast.operator,
      left: buildExpression(ast.left, tableAliases),
      right: buildExpression(ast.right, tableAliases),
    };
  }
  if (ast.type === 'column_ref') {
    return {
      type: 'column_ref',
      table: tableAliases.get(ast.table) || ast.table,
      column: ast.column,
    };
  }
  if (ast.type === 'number') {
    return {
      type: 'number',
      value: ast.value,
    };
  }
  if (ast.type === 'single_quote_string') {
    return {
      type: 'string',
      value: ast.value,
    };
  }
  if (ast.type === 'expr_list') {
    return {
      type: 'array',
      value: ast.value.map(i => i.value),
    };
  }
  throw new Error(`Unknown "${ast.type}" expression type`);
}

export class SelectQuery {
  constructor(
    public from: From | null,
    public columns: Column[],
    public where: Expression | null,
    public orderBy: OrderBy[],
  ) {}

  static fromAst(ast: Select): SelectQuery {
    const from = ast.from
      ? {
        databaseName: ast.from[0].db,
        tableName: ast.from[0].table,
        alias: ast.from[0].as,
      }
      : null;
    const tableAliases = new Map<string, string>();
    if (from?.alias) {
      tableAliases.set(from.alias, from.tableName);
    }

    const columns = [...ast.columns].map((c): Column => {
      if ((c.expr as any)?.type === 'function') {
        return {
          type: 'function',
          name: (c.expr as any).name,
          alias: c.as || (c.expr as any).name + '()',
        };
      } else if (c.expr?.type === 'column_ref' && c.expr.column === '*') {
        return {
          type: 'star',
          table: tableAliases.get(c.expr.table) || c.expr.table,
        };
      } else if (c.expr?.type === 'column_ref') {
        return {
          type: 'column_ref',
          table: tableAliases.get(c.expr.table) || c.expr.table,
          column: c.expr.column,
          alias: c.as,
        };
      } else if (c === '*') {
        return {
          type: 'star',
          table: null,
        };
      }
      throw new Error('Could not map columns');
    });
    const orderBy: OrderBy[] = (ast.orderby || []).map(o => ({
      ...buildExpression(o.expr, tableAliases),
      order: o.type,
    } as OrderBy));

    return new SelectQuery(
      from,
      columns,
      ast.where ? buildExpression(ast.where, tableAliases) : null,
      orderBy,
    );
  }
}
