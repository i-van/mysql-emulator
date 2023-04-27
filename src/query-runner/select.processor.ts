import { Server } from '../server';
import { SelectQuery } from '../parser';
import { mapKeys, md5, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';

export class SelectProcessor {
  protected rows: object[] = [];
  protected groupedRows = new Map<string, object[]>();
  protected fields: string[] = [];

  constructor(protected server: Server, protected query: SelectQuery) {}

  process() {
    this.applyFrom();
    this.applyWhere();
    this.applyGroupBy();
    this.applyOrderBy();
    this.applySelect();

    return this.rows;
  }

  protected applyFrom(): void {
    if (!this.query.from) {
      return;
    }

    const { database, table: tableName } = this.query.from;
    const table = this.server.getDatabase(database).getTable(tableName);

    this.fields = table.getColumns().map(c => `${tableName}::${c.getName()}`);
    this.rows = table.getRows().map(r => mapKeys(r, (key) => `${tableName}::${key}`));
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
    if (this.rows.length === 0 && hasFunctionColumn) {
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

  private createEvaluator(): Evaluator {
    return new Evaluator(this.server, this.fields);
  }
}
