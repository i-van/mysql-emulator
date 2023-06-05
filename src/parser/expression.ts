import { Parser as SqlParser } from 'node-sql-parser';
import { ParserException } from './parser.exception';
import { SelectQuery } from './select-query';

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
export type BooleanType = {
  type: 'boolean';
  value: boolean;
};
export type ArrayType = {
  type: 'array';
  value: (string | number)[];
};
export type NullType = {
  type: 'null';
};
export type DefaultType = {
  type: 'default';
};
export type UnaryExpression = {
  type: 'unary_expression';
  operator: string;
  expression: Expression;
};
export type BinaryExpression = {
  type: 'binary_expression';
  operator: string;
  left: Expression;
  right: Expression;
};
export type SubQuery = {
  type: 'select';
  query: SelectQuery;
};
export type Expression =
  | (SubQuery & { isArray: boolean })
  | UnaryExpression
  | BinaryExpression
  | ColumnRef
  | FunctionType
  | NumberType
  | StringType
  | BooleanType
  | ArrayType
  | NullType
  | DefaultType
  | Star;

export const buildExpression = (ast: any): Expression => {
  if (ast.type === 'unary_expr') {
    return {
      type: 'unary_expression',
      operator: ast.operator,
      expression: buildExpression(ast.expr),
    };
  }
  if (ast.type === 'binary_expr') {
    return {
      type: 'binary_expression',
      operator: ast.operator,
      left: buildExpression(ast.left),
      right: buildExpression(ast.right),
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
      table: ast.table,
    };
  }
  if (ast.type === 'column_ref' && ast.column.toLowerCase() === 'default') {
    return { type: 'default' };
  }
  if (ast.type === 'column_ref') {
    return {
      type: 'column_ref',
      table: ast.table,
      column: ast.column,
    };
  }
  if (ast.type === 'function' || ast.type === 'aggr_func') {
    const args =
      ast.args?.type === 'expr_list'
        ? ast.args.value.map(buildExpression)
        : ast.args?.expr
        ? [buildExpression(ast.args.expr)]
        : [];
    return {
      type: 'function',
      name: ast.name.toLowerCase(),
      args,
    };
  }
  if (ast.type === 'number') {
    return {
      type: 'number',
      value: ast.value,
    };
  }
  if (ast.type === 'single_quote_string' || ast.type === 'string') {
    return {
      type: 'string',
      value: ast.value,
    };
  }
  if (ast.type === 'bool') {
    return {
      type: 'boolean',
      value: ast.value,
    };
  }
  if (ast.type === 'null') {
    return { type: 'null' };
  }
  // handle: id IN (...)
  if (ast.type === 'expr_list' && ast.value[0]?.ast) {
    const sqlParser = new SqlParser();
    const subSql = sqlParser.sqlify(ast.value[0].ast, { database: 'MariaDB' });
    return {
      type: 'select',
      query: SelectQuery.fromAst(ast.value[0].ast, subSql),
      isArray: true,
    };
  }
  if (ast.type === 'expr_list') {
    return {
      type: 'array',
      value: ast.value.map((i) => i.value),
    };
  }
  if (ast.ast) {
    const sqlParser = new SqlParser();
    const subSql = sqlParser.sqlify(ast.ast, { database: 'MariaDB' });
    return {
      type: 'select',
      query: SelectQuery.fromAst(ast.ast, subSql),
      isArray: false,
    };
  }
  throw new ParserException(`Unknown "${ast.type}" expression type`);
};
