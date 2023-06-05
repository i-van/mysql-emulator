import { Parser as SqlParser, Select } from 'node-sql-parser';
import {
  BinaryExpression,
  BooleanType,
  buildExpression,
  ColumnRef,
  Expression,
  FunctionType,
  NullType,
  NumberType,
  Star,
  StringType,
  SubQuery,
} from './expression';
import { parseColumnNames } from './column-name-parser';
import { ParserException } from './parser.exception';

type WithJoin<T> = T & {
  join: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | null;
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
  | WithAlias<WithColumn<SubQuery>>
  | Star;
export type OrderBy = ColumnRef & { order: 'ASC' | 'DESC' };

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

  static fromAst(ast: Select, sql: string): SelectQuery {
    const sqlParser = new SqlParser();
    const from = (ast.from || []).map((f): From => {
      if (f.expr?.ast) {
        const subSql = sqlParser.sqlify(f.expr.ast, { database: 'MariaDB' });
        return {
          type: 'select',
          query: SelectQuery.fromAst(f.expr.ast, subSql),
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

    const columnNames = parseColumnNames(sql);
    const functions = ['aggr_func', 'function'];
    const primitives = ['bool', 'number', 'string', 'single_quote_string', 'null'];
    const columns = [...ast.columns].map((c): SelectColumn => {
      if (c === '*') {
        return buildExpression({ type: 'star', value: c }) as Star;
      } else if (c.expr?.type === 'column_ref' && c.expr.column === '*') {
        return buildExpression(c.expr) as Star;
      } else if (c.expr?.type === 'column_ref') {
        return {
          ...buildExpression(c.expr) as ColumnRef,
          alias: c.as,
        };
      } else if (['binary_expr', ...functions, ...primitives].includes(c.expr?.type)) {
        return {
          ...buildExpression(c.expr) as FunctionType | BinaryExpression | StringType | NumberType | BooleanType | NullType,
          column: columnNames.shift()!,
          alias: c.as,
        };
      } else if (c.expr?.ast) {
        const subSql = columnNames.shift()!;
        return {
          type: 'select',
          query: SelectQuery.fromAst(c.expr.ast, subSql),
          alias: c.as,
          column: subSql,
        };
      }
      throw new ParserException('Could not map columns');
    });
    const groupBy: ColumnRef[] = (ast.groupby || []).map(g => (
      buildExpression(g) as ColumnRef
    ));
    const orderBy: OrderBy[] = (ast.orderby || []).map(o => ({
      ...buildExpression(o.expr) as ColumnRef,
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
