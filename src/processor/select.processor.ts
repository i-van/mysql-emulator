import { Server } from '../server';
import { ColumnRef, Expression, SelectQuery, Star, WithAlias } from '../parser';
import { extractColumn, extractTable, hashCode, mapKeys, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { EvaluatorException } from './evaluator.exception';
import { SubQueryException } from './sub-query.exception';

export class SelectProcessor {
  protected rows: object[] = [];
  protected groupedRows = new Map<number, object[]>();
  protected columns: string[] = [];
  protected evaluator = new Evaluator(this.server, this.context);

  constructor(protected server: Server, protected query: SelectQuery, protected context: object = {}) {}

  process() {
    this.applyFrom();
    this.applyWhere();
    this.applyGroupBy();
    this.applyOrderBy();
    this.applySelectAndHaving();
    this.applyLimit();

    return this.rows;
  }

  protected applyFrom(): void {
    if (this.query.from.length === 0) {
      this.rows = [{}];
      return;
    }

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
        this.rows = rows;
      } else if (from.join === null) {
        // f.e. FROM table1, table2
        this.rows = this.joinRows(this.rows, rows, null);
      } else if (from.join === 'CROSS JOIN') {
        this.rows = this.joinRows(this.rows, rows, from.on);
      } else if (from.join === 'INNER JOIN') {
        this.rows = this.joinRows(this.rows, rows, from.on);
      } else if (from.join === 'LEFT JOIN') {
        const placeholder = columns.reduce((res, key) => ({ ...res, [key]: null }), {});
        this.rows = this.joinRows(this.rows, rows, from.on, placeholder);
      } else {
        throw new ProcessorException(`Unknown "${from.join}" join type`);
      }
    });
  }

  private joinRows(
    rowsA: object[],
    rowsB: object[],
    expression: Expression | null,
    placeholderIfNoMatch: object | null = null,
  ): object[] {
    return rowsA.reduce<object[]>((res: object[], rowA: object) => {
      try {
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
      } catch (err: any) {
        if (err instanceof EvaluatorException) {
          throw new ProcessorException(`${err.message} in 'on clause'`);
        }
        throw err;
      }
    }, []);
  }

  protected applyWhere(): void {
    const { where } = this.query;
    if (!where) {
      return;
    }

    try {
      this.rows = this.rows.filter((row) => this.evaluator.evaluateExpression(where, row));
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'where clause'`);
      }
      throw err;
    }
  }

  protected applyGroupBy(): void {
    if (this.query.groupBy.length === 0) {
      const hasAggregateFunction = this.query.columns.some((c) => {
        return c.type === 'function' && ['count', 'sum', 'min', 'max', 'avg'].includes(c.name);
      });
      if (!hasAggregateFunction) {
        return;
      }

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

      this.groupedRows.set(1, this.rows);
      return;
    }

    try {
      this.rows.forEach((row) => {
        const mapper = (c: ColumnRef) => this.evaluator.evaluateExpression(c, row);
        const hash = hashCode(this.query.groupBy.map(mapper).join('::'));
        this.groupedRows.set(hash, [...(this.groupedRows.get(hash) || []), row]);
      });
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'group statement'`);
      }
      throw err;
    }
  }

  protected applyOrderBy(): void {
    if (this.query.orderBy.length === 0) {
      return;
    }

    try {
      const sortKeys: SortByKey[] = this.query.orderBy.map((o) => ({
        mapper: (row) => this.evaluator.evaluateExpression(o, row),
        order: o.order === 'ASC' ? 1 : -1,
      }));
      this.rows = this.rows.sort(sortBy(sortKeys));
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'order clause'`);
      }
      throw err;
    }
  }

  protected applySelectAndHaving() {
    this.query.columns.forEach((c) => {
      if (c.type !== 'star' && c.alias) {
        this.columns.push(`::${c.alias}`);
      }
    });
    const mapRow = (rawRow: object, group: object[]): [object, object] => {
      try {
        let rawRowWithAliases = rawRow;
        const mappedRow = this.query.columns.reduce((res, c) => {
          if (c.type === 'star') {
            return { ...res, ...this.evaluator.evaluateStar(c, rawRow) };
          }
          const value = this.evaluator.evaluateExpression(c, rawRow, group);
          if (c.alias) {
            rawRowWithAliases = { ...rawRowWithAliases, [`::${c.alias}`]: value };
          }
          return { ...res, [c.alias || c.column]: value };
        }, {});

        return [mappedRow, rawRowWithAliases];
      } catch (err: any) {
        if (err instanceof EvaluatorException) {
          throw new ProcessorException(`${err.message} in 'field list'`);
        }
        throw err;
      }
    };
    const checkIfKeep = (row: object, group: object[]): boolean => {
      if (this.query.having === null) {
        return true;
      }
      try {
        return this.evaluator.evaluateExpression(this.query.having, row, group);
      } catch (err: any) {
        if (err instanceof EvaluatorException) {
          throw new ProcessorException(`${err.message} in 'having clause'`);
        }
        throw err;
      }
    };
    if (this.groupedRows.size === 0) {
      const existingRows = this.rows;
      this.rows = [];
      existingRows.forEach((rawRow) => {
        const [mappedRow, rawRowWithAliases] = mapRow(rawRow, []);
        if (checkIfKeep(rawRowWithAliases, [])) {
          this.rows.push(mappedRow);
        }
      });
    } else {
      this.rows = [];
      this.groupedRows.forEach((group) => {
        const [firstRawRow] = group;
        const [mappedRow, rawRowWithAliases] = mapRow(firstRawRow, group);
        if (checkIfKeep(rawRowWithAliases, group)) {
          this.rows.push(mappedRow);
        }
      });
    }
    if (this.query.distinct && this.rows.length > 0) {
      const index = new Set<string>();
      const keys = Object.keys(this.rows[0]);
      this.rows = this.rows.filter((row) => {
        const value = keys.map((key) => row[key]).join('-');
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
      this.rows = this.rows.filter((_, i) => i >= this.query.offset);
    }
    if (this.query.limit && this.rows.length > this.query.limit) {
      this.rows.length = this.query.limit;
    }
  }
}
