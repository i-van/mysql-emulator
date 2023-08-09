import { Server } from '../server';
import {
  ColumnRef,
  Expression,
  FunctionType,
  GroupBy,
  OrderBy,
  SelectColumn,
  SelectQuery,
  Star,
  WithAlias,
} from '../parser';
import { hashCode, mapKeys, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { EvaluatorException } from './evaluator.exception';
import { SubQueryException } from './sub-query.exception';
import { findExpression } from './expression-finder';

const isAggregateFunction = (e: Expression): e is FunctionType => {
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
  protected columns = new Map<string, string>();
  protected tableColumns = new Map<string | null, WithAlias<ColumnRef>[]>();
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
      let columnRefs: WithAlias<ColumnRef>[];
      if (from.type === 'select') {
        if (!from.alias) {
          throw new SubQueryException('Every derived table must have its own alias');
        }
        const p = new SelectProcessor(this.server, from.query);
        const queryRows = p.process();
        const keys = queryRows.length ? Object.keys(queryRows[0]) : [];
        rows = queryRows.map((r) => mapKeys(r, (key) => `${from.alias}::${key}`));
        columnRefs = keys.map((key) => ({
          type: 'column_ref',
          table: from.alias,
          column: key,
          alias: null,
        }));
      } else {
        const tableAlias = from.alias || from.table;
        const table = this.server.getDatabase(from.database).getTable(from.table);
        rows = [...table.getRows()].map(([k, r]) => mapKeys(r, (key) => `${tableAlias}::${key}`));
        columnRefs = table.getColumns().map((c) => ({
          type: 'column_ref',
          table: tableAlias,
          column: c.getName(),
          alias: null,
        }));
      }

      columnRefs.forEach((columnRef) => {
        const columnKey = `${columnRef.table}::${columnRef.column}`;
        this.columns.set(columnRef.column, columnKey);
        this.columns.set(columnKey, columnKey);

        this.tableColumns.set(null, [...(this.tableColumns.get(null) || []), columnRef]);
        this.tableColumns.set(columnRef.table, [...(this.tableColumns.get(columnRef.table) || []), columnRef]);
      });
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
        const placeholder = columnRefs.reduce((res, c) => ({ ...res, [`${c.table}::${c.column}`]: null }), {});
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
      const aggregateColumnIndexes = new Set<number>();
      for (let index = 0; index < this.query.columns.length; index++) {
        const column = this.query.columns[index];
        const aggregateFunction = findExpression(column, isAggregateFunction);
        if (aggregateFunction) {
          aggregateColumnIndexes.add(index);
        }
      }
      if (aggregateColumnIndexes.size === 0) {
        return;
      }

      for (let index = 0; index < this.query.columns.length; index++) {
        if (aggregateColumnIndexes.has(index)) {
          continue;
        }
        const column = this.query.columns[index];
        if (column.type === 'star') {
          const columns = this.tableColumns.get(column.table);
          if (!columns) {
            throw new ProcessorException(`Unknown table '${column.table}'`);
          }
          // todo: prepend database name to column name
          throw new ProcessorException(
            `In aggregated query without GROUP BY, ` +
              `expression #${index + 1} of SELECT list contains ` +
              `nonaggregated column '${columns[0].table}.${columns[0].column}'`,
          );
        }
        const columnRef = findExpression(column, (e): e is ColumnRef => e.type === 'column_ref');
        if (columnRef) {
          const columnKey = columnRef.table
            ? `${columnRef.table}::${columnRef.column}`
            : this.columns.get(columnRef.column);
          if (!columnKey || !this.columns.has(columnKey)) {
            const name = columnRef.table ? `${columnRef.table}.${columnRef.column}` : columnRef.column;
            throw new ProcessorException(`Unknown column '${name}' in 'field list'`);
          }
          // todo: prepend database name to column name
          throw new ProcessorException(
            `In aggregated query without GROUP BY, ` +
              `expression #${index + 1} of SELECT list contains ` +
              `nonaggregated column '${columnKey.replace('::', '.')}'`,
          );
        }
      }

      const rows = this.items.map((i) => i.row);
      this.items = [new Item(rows[0] ?? {}, rows)];
      return;
    }

    try {
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
        const aggregateFunction = findExpression(g, isAggregateFunction);
        if (aggregateFunction) {
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
    const queryColumns: Exclude<SelectColumn, Star>[] = this.query.columns.flatMap((c) => {
      if (c.type !== 'star') {
        return c;
      }
      const columns = this.tableColumns.get(c.table);
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
