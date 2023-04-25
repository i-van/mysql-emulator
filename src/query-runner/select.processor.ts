import { Server } from '../server';
import { SelectQuery } from '../parser';
import { mapKeys, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';

export class SelectProcessor {
  protected rows: any[] = [];
  protected fields: string[] = [];

  constructor(protected server: Server, protected query: SelectQuery) {}

  process() {
    this.applyFrom();
    this.applyWhere();
    this.applyOrderBy();
    this.applySelect();

    return this.rows;
  }

  protected applyFrom(): void {
    if (!this.query.from) {
      return;
    }

    const { databaseName, tableName } = this.query.from;
    const table = this.server.getDatabase(databaseName).getTable(tableName);

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
    this.rows = this.rows.map((row) => {
      return this.query.columns.reduce((res, c) => {
        if (c.type === 'star') {
          return {
            ...res,
            ...evaluator.evaluateStar(c, row),
          };
        }
        const key = c.type === 'function'
          ? c.alias
          : c.alias || c.column;
        return {
          ...res,
          [key]: evaluator.evaluateExpression(c, row),
        };
      }, {});
    });
  }

  private createEvaluator(): Evaluator {
    return new Evaluator(this.server, this.fields);
  }
}
