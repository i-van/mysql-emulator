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
  column: string;
  args: Expression[];
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
export type DefaultType = {
  type: 'default';
};
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
export type Expression =
  | UnaryExpression
  | BinaryExpression
  | ColumnRef
  | FunctionType
  | NumberType
  | StringType
  | ArrayType
  | DefaultType
  | Star;

export const buildExpression = (ast: any, tableAliases: Map<string, string>): Expression => {
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
  if (ast.type === 'star') {
    return {
      type: 'star',
      table: null,
    };
  }
  if (ast.type === 'column_ref' && ast.column === '*') {
    return {
      type: 'star',
      table: tableAliases.get(ast.table) || ast.table,
    };
  }
  if (ast.type === 'column_ref' && ast.column.toLowerCase() === 'default') {
    return { type: 'default' };
  }
  if (ast.type === 'column_ref') {
    return {
      type: 'column_ref',
      table: tableAliases.get(ast.table) || ast.table,
      column: ast.column,
    };
  }
  if (ast.type === 'function' || ast.type === 'aggr_func') {
    const args = ast.args.type === 'expr_list'
      ? ast.args.value.map(e => buildExpression(e, tableAliases))
      : [buildExpression(ast.args.expr, tableAliases)];
    return {
      type: 'function',
      name: ast.name,
      column: `${ast.name}()`,
      args,
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
};
