import { Server } from '../server';
import { UpdateQuery } from '../parser';
import { mapKeys } from '../utils';
import { Evaluator } from './evaluator';
import { castValue, createColumnDefinitionGetter, createCurrentTimestampApplier } from './helpers';

export class UpdateProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: UpdateQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.alias || query.table}::${key}`;
    const columnDefinitions = table.getColumns();
    const getColumnDefinition = createColumnDefinitionGetter(columnDefinitions);
    const applyCurrentTimestamp = createCurrentTimestampApplier(columnDefinitions, query.assignments);

    let changedRows = 0;
    let affectedRows = 0;
    table.getRows().forEach((existingRow, id) => {
      const rawRow = mapKeys(existingRow, keyMapper);
      const needsUpdate = query.where === null || this.evaluator.evaluateExpression(query.where, rawRow);
      if (!needsUpdate) {
        return;
      }

      affectedRows++;
      const updatedRow = query.assignments.reduce((row, a) => {
        const column = getColumnDefinition(a.column);
        const rawValue = this.evaluator.evaluateExpression(a.value, rawRow);
        const nextValue = castValue(column, rawValue, affectedRows);
        const currentValue = row[column.getName()];

        return nextValue !== currentValue ? { ...row, [column.getName()]: nextValue } : row;
      }, existingRow);

      if (existingRow === updatedRow) {
        return;
      }

      changedRows++;
      table.updateRow(id, applyCurrentTimestamp(updatedRow));
    });

    return { affectedRows, changedRows };
  }
}
