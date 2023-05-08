import { Server } from '../server';
import { Expression, SelectQuery } from '../parser';
import { mapKeys, md5, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';

export class SelectProcessor {
  protected rows: object[] = [];
  protected groupedRows = new Map<string, object[]>();
  protected columns: string[] = [];

  constructor(protected server: Server, protected query: SelectQuery) {}

  process() {
    this.applyFrom();
    this.applyWhere();
    this.applyGroupBy();
    this.applyOrderBy();
    this.applySelect();
    this.applyLimit();

    return this.rows;
  }

  protected applyFrom(): void {
    if (this.query.from.length === 0) {
      return;
    }

    this.query.from.forEach((from, i) => {
      const table = this.server.getDatabase(from.database).getTable(from.table);
      const columns = table.getColumns().map(c => `${from.table}::${c.getName()}`);
      const rows = table.getRows().map(r => mapKeys(r, (key) => `${from.table}::${key}`));

      this.columns.push(...columns);
      if (i === 0) {
        this.rows = rows;
      } else if (from.join === null) { // f.e. FROM table1, table2
        this.rows = this.joinRows(this.rows, rows, null);
      } else if (from.join === 'INNER JOIN') {
        this.rows = this.joinRows(this.rows, rows, from.on);
      } else if (from.join === 'LEFT JOIN') {
        this.rows = this.joinRows(this.rows, rows, from.on, true);
      } else {
        throw new Error(`Unknown "${from.join}" join type`);
      }
    });
  }

  private joinRows(
    rowsA: object[],
    rowsB: object[],
    expression: Expression | null,
    includeRowIfNoMatch = false,
  ): object[] {
    const evaluator = this.createEvaluator();
    return rowsA.reduce((res: object[], rowA: object) => {
      const group: object[] = [];
      for (const rowB of rowsB) {
        const mergedRow = { ...rowA, ...rowB };
        if (expression === null || evaluator.evaluateExpression(expression, mergedRow)) {
          group.push(mergedRow);
        }
      }
      if (group.length === 0 && includeRowIfNoMatch) {
        group.push(rowA);
      }
      return [...res, ...group];
    }, []);
  }

  protected applyWhere(): void {
    const { where } = this.query;
    if (!where) {
      return;
    }

    const evaluator = this.createEvaluator();
    this.rows = this.rows.filter((row) => evaluator.evaluateExpression(where, row));
  }

  protected applyGroupBy(): void {
    if (this.query.groupBy.length === 0) {
      return;
    }

    const evaluator = this.createEvaluator();
    this.rows.forEach(row => {
      const hash = md5(this.query.groupBy.map(c => {
        return evaluator.evaluateExpression(c, row);
      }).join('::'));
      this.groupedRows.set(hash, [...this.groupedRows.get(hash) || [], row]);
    });
  }

  protected applyOrderBy(): void {
    if (this.query.orderBy.length === 0) {
      return;
    }

    const evaluator = this.createEvaluator();
    const sortKeys: SortByKey[] = this.query.orderBy.map(o => ({
      mapper: (row) => evaluator.evaluateExpression(o, row),
      order: o.order === 'ASC' ? 1 : -1,
    }));
    this.rows = this.rows.sort(sortBy(sortKeys));
  }

  protected applySelect() {
    const hasFunctionColumn = this.query.columns.find(c => c.type === 'function');
    const hasExpressionColumn = this.query.columns.find(c => c.type === 'binary_expression');
    if (this.rows.length === 0 && (hasFunctionColumn || hasExpressionColumn)) {
      this.rows = [{}];
    }

    const evaluator = this.createEvaluator();
    if (this.query.groupBy.length === 0) {
      this.rows = this.rows.map((row) => {
        return this.query.columns.reduce((res, c) => {
          if (c.type === 'star') {
            return {
              ...res,
              ...evaluator.evaluateStar(c, row),
            };
          }
          return {
            ...res,
            [c.alias || c.column]: evaluator.evaluateExpression(c, row),
          };
        }, {});
      });
      return;
    }

    this.rows = [];
    this.groupedRows.forEach((rows) => {
      const [firstRow] = rows;
      const result = this.query.columns.reduce((res, c) => {
        if (c.type === 'star') {
          return {
            ...res,
            ...evaluator.evaluateStar(c, firstRow),
          };
        }
        return {
          ...res,
          [c.alias || c.column]: evaluator.evaluateExpression(c, firstRow, rows),
        };
      }, {});
      this.rows.push(result);
    });
  }

  protected applyLimit() {
    if (this.query.offset) {
      this.rows = this.rows.filter((_, i) => i >= this.query.offset);
    }
    if (this.query.limit && this.rows.length > this.query.limit) {
      this.rows.length = this.query.limit;
    }
  }

  private createEvaluator(): Evaluator {
    return new Evaluator(this.server, this.columns);
  }
}
