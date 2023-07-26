import { Server } from '../server';
import { UpdateQuery } from '../parser';
import { mapKeys, sortBy, SortByKey } from '../utils';
import { Evaluator } from './evaluator';
import { castValue, createColumnDefinitionGetter, createCurrentTimestampApplier } from './helpers';
import { ProcessorException } from './processor.exception';
import { EvaluatorException } from './evaluator.exception';

type Item = {
  id: number;
  row: object;
  rawRow: object;
};

export class UpdateProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: UpdateQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.alias || query.table}::${key}`;
    const columnDefinitions = table.getColumns();
    const getColumnDefinition = createColumnDefinitionGetter(columnDefinitions);
    const applyCurrentTimestamp = createCurrentTimestampApplier(columnDefinitions, query.assignments);

    const items: Item[] = [];
    table.getRows().forEach((row, id) => {
      items.push({
        id,
        row,
        rawRow: mapKeys(row, keyMapper),
      });
    });
    this.applyWhere(items, query);
    this.applyOrderBy(items, query);
    this.applyLimit(items, query);

    let changedRows = 0;
    let affectedRows = 0;
    for (const { id, row: existingRow, rawRow } of items) {
      affectedRows++;
      const updatedRow = query.assignments.reduce((row, a) => {
        const column = getColumnDefinition(a.column);
        const rawValue = this.evaluator.evaluateExpression(a.value, rawRow);
        const nextValue = castValue(column, rawValue, affectedRows);
        const currentValue = row[column.getName()];

        return nextValue !== currentValue ? { ...row, [column.getName()]: nextValue } : row;
      }, existingRow);

      if (existingRow === updatedRow) {
        continue;
      }

      changedRows++;
      table.updateRow(id, applyCurrentTimestamp(updatedRow));
    }

    return { affectedRows, changedRows };
  }

  protected applyWhere(items: Item[], query: UpdateQuery): void {
    const { where } = query;
    if (!where) {
      return;
    }

    try {
      let i = 0;
      while (i < items.length) {
        const { rawRow } = items[i];
        if (this.evaluator.evaluateExpression(where, rawRow)) {
          i++;
        } else {
          items.splice(i, 1);
        }
      }
    } catch (err: any) {
      if (err instanceof EvaluatorException) {
        throw new ProcessorException(`${err.message} in 'where clause'`);
      }
      throw err;
    }
  }

  protected applyOrderBy(items: Item[], query: UpdateQuery): void {
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

  protected applyLimit(items: Item[], query: UpdateQuery): void {
    if (query.limit && items.length > query.limit) {
      items.length = query.limit;
    }
  }
}
