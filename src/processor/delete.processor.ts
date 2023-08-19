import { Server } from '../server';
import { DeleteQuery } from '../parser';
import { mapKeys, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';
import { EvaluatorException } from './evaluator.exception';
import { ProcessorException } from './processor.exception';

type Item = {
  id: number;
  rawRow: object;
};

export class DeleteProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: DeleteQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.alias || query.table}::${key}`;

    const items: Item[] = [];
    table.getRows().forEach((row, id) => {
      items.push({
        id,
        rawRow: mapKeys(row, keyMapper),
      });
    });
    this.applyWhere(items, query);
    this.applyOrderBy(items, query);
    this.applyLimit(items, query);

    for (const { id } of items) {
      table.deleteRow(id);
    }

    return {
      affectedRows: items.length,
    };
  }

  protected applyWhere(items: Item[], query: DeleteQuery): void {
    const { where } = query;
    if (!where) {
      return;
    }

    try {
      let j = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (this.evaluator.evaluateExpression(where, item.rawRow)) {
          items[j++] = item;
        }
      }
      items.length = j;
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'where clause'`);
      }
      throw err;
    }
  }

  protected applyOrderBy(items: Item[], query: DeleteQuery): void {
    if (query.orderBy.length === 0) {
      return;
    }

    try {
      const sortKeys: SortByKey[] = query.orderBy.map((o) => ({
        mapper: (i: Item) => this.evaluator.evaluateExpression(o, i.rawRow),
        order: o.order === 'ASC' ? 1 : -1,
      }));
      items.sort(sortBy(sortKeys));
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'order clause'`);
      }
      throw err;
    }
  }

  protected applyLimit(items: Item[], query: DeleteQuery): void {
    if (query.limit && items.length > query.limit) {
      items.length = query.limit;
    }
  }
}
