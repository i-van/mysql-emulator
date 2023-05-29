import { Select } from 'node-sql-parser';
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
} from './expression';
import { parseColumnNames } from './column-name-parser';
import { ParserException } from './parser.exception';

export type From = {
  database: string | null;
  table: string;
  join: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | null;
  on: Expression | null;
};

type WithAlias<T> = T & { alias: string | null };
type WithColumn<T> = T & { column: string };
export type SelectColumn =
  | WithAlias<ColumnRef>
  | WithAlias<WithColumn<FunctionType>>
  | WithAlias<WithColumn<BinaryExpression>>
  | WithAlias<WithColumn<StringType>>
  | WithAlias<WithColumn<NumberType>>
  | WithAlias<WithColumn<BooleanType>>
  | WithAlias<WithColumn<NullType>>
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
    const tableAliases = new Map<string, string>();
    (ast.from || []).forEach(f => f.as && tableAliases.set(f.as, f.table));
    const from = (ast.from || []).map(f => ({
      database: f.db || null,
      table: f.table,
      join: f.join || null,
      on: f.on ? buildExpression(f.on, tableAliases) : null,
    }));

    const columnNames = parseColumnNames(sql);
    const functions = ['aggr_func', 'function'];
    const primitives = ['bool', 'number', 'string', 'single_quote_string', 'null'];
    const columns = [...ast.columns].map((c): SelectColumn => {
      if (c === '*') {
        return buildExpression({ type: 'star', value: c }, tableAliases) as Star;
      } else if (c.expr?.type === 'column_ref' && c.expr.column === '*') {
        return buildExpression(c.expr, tableAliases) as Star;
      } else if (c.expr?.type === 'column_ref') {
        return {
          ...buildExpression(c.expr, tableAliases) as ColumnRef,
          alias: c.as,
        };
      } else if (['binary_expr', ...functions, ...primitives].includes(c.expr?.type)) {
        return {
          ...buildExpression(c.expr, tableAliases) as FunctionType | BinaryExpression | StringType | NumberType | BooleanType | NullType,
          column: columnNames.shift()!,
          alias: c.as,
        };
      }
      throw new ParserException('Could not map columns');
    });
    const groupBy: ColumnRef[] = (ast.groupby || []).map(g => (
      buildExpression(g, tableAliases) as ColumnRef
    ));
    const orderBy: OrderBy[] = (ast.orderby || []).map(o => ({
      ...buildExpression(o.expr, tableAliases),
      order: o.type,
    } as OrderBy));
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
      ast.where ? buildExpression(ast.where, tableAliases) : null,
      groupBy,
      ast.having ? buildExpression(ast.having, tableAliases) : null,
      orderBy,
      limit,
      offset,
    );
  }
}
