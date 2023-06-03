import { Server } from '../server';
import { ColumnRef, Expression, isSubQuery, SelectQuery } from '../parser';
import { mapKeys, md5, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { EvaluatorException } from './evaluator.exception';

export class SelectProcessor {
  protected rows: object[] = [];
  protected groupedRows = new Map<string, object[]>();
  protected columns: string[] = [];
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server, protected query: SelectQuery) {}

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
      return;
    }

    this.query.from.forEach((from, i) => {
      let rows: object[];
      let columns: string[];
      if (isSubQuery(from)) {
        if (!from.alias) {
          throw new ProcessorException('Every derived table must have its own alias');
        }
        const p = new SelectProcessor(this.server, from.query);
        rows = p.process().map(r => mapKeys(r, (key) => `${from.alias}::${key}`));
        columns = rows.length ? Object.keys(rows[0]) : [];
      } else {
        const table = this.server.getDatabase(from.database).getTable(from.table);
        const keyMapper = (key: string) => `${from.alias || from.table}::${key}`;
        rows = table.getRows().map(r => mapKeys(r, keyMapper));
        columns = table.getColumns().map(c => keyMapper(c.getName()));
      }

      this.columns.push(...columns);
      if (i === 0) {
        this.rows = rows;
      } else if (from.join === null) { // f.e. FROM table1, table2
        this.rows = this.joinRows(this.rows, rows, null);
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
      return;
    }

    try {
      this.rows.forEach(row => {
        const mapper = (c: ColumnRef) => this.evaluator.evaluateExpression(c, row);
        const hash = md5(this.query.groupBy.map(mapper).join('::'));
        this.groupedRows.set(hash, [...this.groupedRows.get(hash) || [], row]);
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
      const sortKeys: SortByKey[] = this.query.orderBy.map(o => ({
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
    const hasFunctionColumn = this.query.columns.find(c => c.type === 'function');
    const hasPrimitiveColumn = this.query.columns.find(c => ['number', 'string', 'boolean', 'null'].includes(c.type));
    const hasExpressionColumn = this.query.columns.find(c => c.type === 'binary_expression');
    if (this.rows.length === 0 && (hasFunctionColumn || hasExpressionColumn || hasPrimitiveColumn)) {
      this.rows = [{}];
    }

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
    const checkIfKeep = (row: object): boolean => {
      if (this.query.having === null) {
        return true;
      }
      try {
        return this.evaluator.evaluateExpression(this.query.having, row);
      } catch (err: any) {
        if (err instanceof EvaluatorException) {
          throw new ProcessorException(`${err.message} in 'having clause'`);
        }
        throw err;
      }
    };
    if (this.query.groupBy.length === 0) {
      const existingRows = this.rows;
      this.rows = [];
      existingRows.forEach((rawRow) => {
        const [mappedRow, rawRowWithAliases] = mapRow(rawRow, []);
        if (checkIfKeep(rawRowWithAliases)) {
          this.rows.push(mappedRow);
        }
      });
    } else {
      this.rows = [];
      this.groupedRows.forEach((group) => {
        const [firstRawRow] = group;
        const [mappedRow, rawRowWithAliases] = mapRow(firstRawRow, group);
        if (checkIfKeep(rawRowWithAliases)) {
          this.rows.push(mappedRow);
        }
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
