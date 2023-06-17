import { Parser as SqlParser, Select } from 'node-sql-parser';
import {
  BinaryExpression,
  BooleanType,
  buildExpression,
  CaseType,
  ColumnRef,
  Expression,
  FunctionType,
  NullType,
  NumberType,
  Star,
  StringType,
  SubQuery,
} from './expression';
import { ParserException } from './parser.exception';

type WithJoin<T> = T & {
  join: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | 'CROSS JOIN' | null;
  on: Expression | null;
};
export type From =
  | WithJoin<WithAlias<{ type: 'from'; database: string | null; table: string }>>
  | WithJoin<WithAlias<SubQuery>>;

export type WithAlias<T> = T & { alias: string | null };
type WithColumn<T> = T & { column: string };
export type SelectColumn =
  | WithAlias<ColumnRef>
  | WithAlias<WithColumn<FunctionType>>
  | WithAlias<WithColumn<BinaryExpression>>
  | WithAlias<WithColumn<StringType>>
  | WithAlias<WithColumn<NumberType>>
  | WithAlias<WithColumn<BooleanType>>
  | WithAlias<WithColumn<NullType>>
  | WithAlias<WithColumn<CaseType>>
  | WithAlias<WithColumn<SubQuery & { isArray: false }>>
  | Star;
export type OrderBy = ColumnRef & { order: 'ASC' | 'DESC' };

const sqlParser = new SqlParser();
const toSql = (expr: any): string => {
  if (expr.type === 'single_quote_string' || expr.type === 'string') {
    return expr.value;
  } else if (expr.type === 'select') {
    return `(${sqlParser.sqlify(expr, { database: 'MariaDB' })})`;
  }
  return sqlParser.exprToSQL(expr, { database: 'MariaDB' });
};

export class SelectQuery {
  constructor(
    public from: From[],
    public columns: SelectColumn[],
    public where: Expression | null,
    public groupBy: ColumnRef[],
    public having: Expression | null,
    public orderBy: OrderBy[],
    public limit: number,
    public offset: number,
  ) {}

  static fromAst(ast: Select): SelectQuery {
    const from = (ast.from || []).map((f): From => {
      if (f.expr?.ast) {
        return {
          type: 'select',
          query: SelectQuery.fromAst(f.expr.ast),
          alias: f.as,
          join: f.join || null,
          on: f.on ? buildExpression(f.on) : null,
        };
      }
      return {
        type: 'from',
        database: f.db || null,
        table: f.table,
        alias: f.as || null,
        join: f.join || null,
        on: f.on ? buildExpression(f.on) : null,
      };
    });

    const functions = ['aggr_func', 'function'];
    const primitives = ['bool', 'number', 'string', 'single_quote_string', 'null'];
    const columns = [...ast.columns].map((c): SelectColumn => {
      if (c === '*') {
        return buildExpression({ type: 'star', value: c }) as Star;
      } else if (c.expr?.type === 'column_ref' && c.expr.column === '*') {
        return buildExpression(c.expr) as Star;
      } else if (c.expr?.type === 'column_ref') {
        return {
          ...(buildExpression(c.expr) as ColumnRef),
          alias: c.as,
        };
      } else if (['case', 'binary_expr', ...functions, ...primitives].includes(c.expr?.type)) {
        return {
          ...(buildExpression(c.expr) as
            | CaseType
            | FunctionType
            | BinaryExpression
            | StringType
            | NumberType
            | BooleanType
            | NullType),
          column: toSql(c.expr),
          alias: c.as,
        };
      } else if (c.expr?.ast) {
        return {
          ...buildExpression(c.expr) as SubQuery & { isArray: false },
          column: toSql(c.expr.ast),
          alias: c.as,
        };
      }
      throw new ParserException('Could not map columns');
    });
    const groupBy: ColumnRef[] = (ast.groupby || []).map((g) => buildExpression(g) as ColumnRef);
    const orderBy: OrderBy[] = (ast.orderby || []).map((o) => ({
      ...(buildExpression(o.expr) as ColumnRef),
      order: o.type,
    }));
    let limit = 0;
    let offset = 0;
    if (ast.limit?.value.length === 1) {
      [{ value: limit }] = ast.limit?.value;
    } else if (ast.limit?.value.length === 2 && ast.limit?.seperator === ',') {
      [{ value: offset }, { value: limit }] = ast.limit?.value;
    } else if (ast.limit?.value.length === 2 && ast.limit?.seperator === 'offset') {
      [{ value: limit }, { value: offset }] = ast.limit?.value;
    }

    return new SelectQuery(
      from,
      columns,
      ast.where ? buildExpression(ast.where) : null,
      groupBy,
      ast.having ? buildExpression(ast.having) : null,
      orderBy,
      limit,
      offset,
    );
  }
}
