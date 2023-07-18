import { Server } from '../server';
import { ColumnRef, Expression, GroupBy, OrderBy, SelectColumn, SelectQuery, Star, WithAlias } from '../parser';
import { extractColumn, extractTable, hashCode, mapKeys, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { EvaluatorException } from './evaluator.exception';
import { SubQueryException } from './sub-query.exception';

const isAggregateFunction = (e: Expression): boolean => {
  return e.type === 'function' && ['count', 'sum', 'min', 'max', 'avg'].includes(e.name);
};

class Item {
  constructor(
    public row: object,
    public group: object[] = [],
    public result: object = {},
  ) {}
}

export class SelectProcessor {
  protected items: Item[] = [];
  protected columns: string[] = [];
  protected evaluator = new Evaluator(this.server, this.context);

  constructor(
    protected server: Server,
    protected query: SelectQuery,
    protected context: object = {},
  ) {}

  process() {
    this.applyFrom();
    this.applyWhere();
    this.preSelectAliases();
    this.applyGroupBy();
    this.preSelectAliases();
    this.applyHaving();
    this.applySelect();
    this.applyOrderBy();
    this.applyLimit();

    return this.items.map((i) => i.result);
  }

  protected applyFrom(): void {
    if (this.query.from.length === 0) {
      this.items = [new Item({})];
      return;
    }

    let joinedRows: object[] = [];
    this.query.from.forEach((from, i) => {
      let rows: object[];
      let columns: string[];
      if (from.type === 'select') {
        if (!from.alias) {
          throw new SubQueryException('Every derived table must have its own alias');
        }
        const p = new SelectProcessor(this.server, from.query);
        rows = p.process().map((r) => mapKeys(r, (key) => `${from.alias}::${key}`));
        columns = rows.length ? Object.keys(rows[0]) : [];
      } else {
        const table = this.server.getDatabase(from.database).getTable(from.table);
        const keyMapper = (key: string) => `${from.alias || from.table}::${key}`;
        rows = [...table.getRows()].map(([k, r]) => mapKeys(r, keyMapper));
        columns = table.getColumns().map((c) => keyMapper(c.getName()));
      }

      this.columns.push(...columns);
      if (i === 0) {
        joinedRows = rows;
      } else if (from.join === null) {
        // f.e. FROM table1, table2
        joinedRows = this.joinRows(joinedRows, rows, null);
      } else if (from.join === 'CROSS JOIN') {
        joinedRows = this.joinRows(joinedRows, rows, from.on);
      } else if (from.join === 'INNER JOIN') {
        joinedRows = this.joinRows(joinedRows, rows, from.on);
      } else if (from.join === 'LEFT JOIN') {
        const placeholder = columns.reduce((res, key) => ({ ...res, [key]: null }), {});
        joinedRows = this.joinRows(joinedRows, rows, from.on, placeholder);
      } else {
        throw new ProcessorException(`Unknown "${from.join}" join type`);
      }
    });
    this.items = joinedRows.map((row) => new Item(row));
  }

  private joinRows(
    rowsA: object[],
    rowsB: object[],
    expression: Expression | null,
    placeholderIfNoMatch: object | null = null,
  ): object[] {
    try {
      return rowsA.reduce<object[]>((res: object[], rowA: object) => {
        const group: object[] = [];
        for (const rowB of rowsB) {
          const mergedRow = { ...rowA, ...rowB };
          if (expression === null || this.evaluator.evaluateExpression(expression, mergedRow)) {
            group.push(mergedRow);
          }
        }
        if (group.length === 0 && placeholderIfNoMatch) {
          group.push({ ...rowA, ...placeholderIfNoMatch });
        }
        return [...res, ...group];
      }, []);
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'on clause'`);
      }
      throw err;
    }
  }

  protected preSelectAliases(): void {
    const columnsWithAliases = this.query.columns.filter((c: SelectColumn): c is Exclude<SelectColumn, Star> => {
      if (c.type === 'star') {
        return false;
      }
      return Boolean(c.alias);
    });
    if (columnsWithAliases.length === 0) {
      return;
    }

    const assignAliases = (rawRow: object, group: object[]): object => {
      return columnsWithAliases.reduce((res, c) => {
        const value = this.evaluator.evaluateExpression(c, rawRow, group);
        return { ...res, [`::${c.alias}`]: value };
      }, rawRow);
    };
    try {
      this.items.forEach((i) => {
        i.row = assignAliases(i.row, i.group);
      });
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'field list'`);
      }
      throw err;
    }
  }

  protected applyWhere(): void {
    const { where } = this.query;
    if (!where) {
      return;
    }

    try {
      this.items = this.items.filter((i) => this.evaluator.evaluateExpression(where, i.row));
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'where clause'`);
      }
      throw err;
    }
  }

  protected applyGroupBy(): void {
    if (this.query.groupBy.length === 0) {
      // todo: deep search
      const hasAggregateFunction = this.query.columns.some(isAggregateFunction);
      if (!hasAggregateFunction) {
        return;
      }

      // todo: deep search
      const columnRef = this.query.columns.find((c): c is WithAlias<ColumnRef> => c.type === 'column_ref');
      if (columnRef) {
        const columnName = columnRef.table
          ? `${columnRef.table}::${columnRef.column}`
          : this.columns.find((key) => extractColumn(key) === columnRef.column);
        if (!columnName || !this.columns.includes(columnName)) {
          const name = columnRef.table ? `${columnRef.table}.${columnRef.column}` : columnRef.column;
          throw new ProcessorException(`Unknown column '${name}' in 'field list'`);
        }
        const columnRefIndex = this.query.columns.indexOf(columnRef);
        // todo: prepend database name to column name
        throw new ProcessorException(
          `In aggregated query without GROUP BY, ` +
            `expression #${columnRefIndex + 1} of SELECT list contains ` +
            `nonaggregated column '${columnName.replace('::', '.')}'`,
        );
      }
      const star = this.query.columns.find((c): c is Star => c.type === 'star');
      if (star) {
        let columnName = this.columns.find((key) => (star.table ? star.table === extractTable(key) : true));
        if (!columnName) {
          columnName = this.columns[0];
        }
        // todo: it won't happen, there should be some error
        if (!columnName) {
          columnName = star.table ? `${star.table}::*` : '*';
        }
        const starIndex = this.query.columns.indexOf(star);
        // todo: prepend database name to column name
        throw new ProcessorException(
          `In aggregated query without GROUP BY, ` +
            `expression #${starIndex + 1} of SELECT list contains ` +
            `nonaggregated column '${columnName.replace('::', '.')}'`,
        );
      }

      const rows = this.items.map((i) => i.row);
      this.items = [new Item(rows[0] ?? {}, rows)];
      return;
    }

    try {
      // todo: deep search
      const groupBy = this.query.groupBy.map((g: GroupBy) => {
        if (g.type === 'number') {
          const column = this.query.columns[g.value - 1];
          if (!column) {
            throw new ProcessorException(`Unknown column '${g.value}' in 'group statement'`);
          } else if (column.type === 'star') {
            const star = column.table ? `${column.table}.*` : '*';
            throw new ProcessorException(`Not implemented: group on '${star}'`);
          } else if (column.type === 'select') {
            throw new ProcessorException(`Not implemented: group on '${column.column}'`);
          } else if (isAggregateFunction(column)) {
            throw new ProcessorException(`Can't group on '${column.column}'`);
          }
          return column;
        }
        if (isAggregateFunction(g)) {
          throw new ProcessorException(`Can't group on '${g.column}'`);
        }
        return g;
      });
      const groups = new Map<number, object[]>();
      this.items.forEach((i) => {
        const mapper = (g: GroupBy) => this.evaluator.evaluateExpression(g, i.row);
        const hash = hashCode(groupBy.map(mapper).join('::'));
        groups.set(hash, [...(groups.get(hash) || []), i.row]);
      });
      this.items = [];
      groups.forEach((group) => {
        this.items.push(new Item(group[0], group));
      });
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'group statement'`);
      }
      throw err;
    }
  }

  protected applyHaving(): void {
    const { having } = this.query;
    if (!having) {
      return;
    }

    try {
      this.items = this.items.filter((i) => this.evaluator.evaluateExpression(having, i.row, i.group));
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'having clause'`);
      }
      throw err;
    }
  }

  protected applyOrderBy(): void {
    if (this.query.orderBy.length === 0) {
      return;
    }

    try {
      const orderBy = this.query.orderBy.map((g: OrderBy): OrderBy => {
        if (g.type === 'number') {
          const column = this.query.columns[g.value - 1];
          if (!column) {
            throw new ProcessorException(`Unknown column '${g.value}' in 'group statement'`);
          } else if (column.type === 'star') {
            const star = column.table ? `${column.table}.*` : '*';
            throw new ProcessorException(`Not implemented: group on '${star}'`);
          } else if (column.type === 'select') {
            throw new ProcessorException(`Not implemented: group on '${column.column}'`);
          }
          return { ...column, order: g.order };
        }
        return g;
      });
      const sortKeys: SortByKey[] = orderBy.map((o) => ({
        mapper: (i: Item) => this.evaluator.evaluateExpression(o, i.row, i.group),
        order: o.order === 'ASC' ? 1 : -1,
      }));
      this.items.sort(sortBy(sortKeys));
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'order clause'`);
      }
      throw err;
    }
  }

  protected applySelect() {
    const tableColumns = new Map<string | null, WithAlias<ColumnRef>[]>();
    this.columns.forEach((key) => {
      const [table, column] = key.split('::');
      const columnRef: WithAlias<ColumnRef> = {
        type: 'column_ref',
        table,
        column,
        alias: null,
      };
      tableColumns.set(table, [...(tableColumns.get(table) || []), columnRef]);
      tableColumns.set(null, [...(tableColumns.get(null) || []), columnRef]);
    });
    const queryColumns: Exclude<SelectColumn, Star>[] = this.query.columns.flatMap((c) => {
      if (c.type !== 'star') {
        return c;
      }
      const columns = tableColumns.get(c.table);
      if (!columns) {
        throw new ProcessorException(`Unknown table '${c.table}'`);
      }
      return columns;
    });
    const mapRow = (rawRow: object, group: object[]): object => {
      return queryColumns.reduce((res, c) => {
        const value = this.evaluator.evaluateExpression(c, rawRow, group);
        return { ...res, [c.alias || c.column]: value };
      }, {});
    };
    try {
      this.items.forEach((i) => {
        i.result = mapRow(i.row, i.group);
      });
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'field list'`);
      }
      throw err;
    }
    if (this.query.distinct && this.items.length > 0) {
      const index = new Set<string>();
      this.items = this.items.filter((i) => {
        const value = queryColumns.map((c) => String(i.result[c.alias || c.column])).join('-');
        if (index.has(value)) {
          return false;
        }
        index.add(value);
        return true;
      });
    }
  }

  protected applyLimit() {
    if (this.query.offset) {
      this.items = this.items.filter((_, i) => i >= this.query.offset);
    }
    if (this.query.limit && this.items.length > this.query.limit) {
      this.items.length = this.query.limit;
    }
  }
}
