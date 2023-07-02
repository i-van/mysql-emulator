import { Column, DateColumn, Server } from '../server';
import { Assignment, UpdateQuery } from '../parser';
import { mapKeys } from '../utils';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';

export class UpdateProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: UpdateQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.alias || query.table}::${key}`;
    const columnDefinitions = table.getColumns();
    const columnDefinitionMap = new Map<string, Column>(columnDefinitions.map((c) => [c.getName(), c]));
    const getColumnDefinition = (column: string): Column => {
      const c = columnDefinitionMap.get(column);
      if (!c) {
        throw new ProcessorException(`Unknown column '${column}' in 'field list'`);
      }
      return c;
    };
    const updatingColumns = new Set<string>(query.assignments.map((a) => a.column));
    const applyCurrentTimestamp = (row: object) =>
      columnDefinitions.reduce((row, c) => {
        const hasOnUpdate = c instanceof DateColumn && c.hasOnUpdateCurrentTimestamp();
        const updated = updatingColumns.has(c.getName());
        return hasOnUpdate && !updated ? { ...row, [c.getName()]: new Date() } : row;
      }, row);

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
        try {
          const column = getColumnDefinition(a.column);
          const nextValue = column.cast(this.evaluator.evaluateExpression(a.value, rawRow));
          const currentValue = row[column.getName()];

          return nextValue !== currentValue ? { ...row, [column.getName()]: nextValue } : row;
        } catch (err: any) {
          if (['OUT_OF_RANGE_VALUE', 'INCORRECT_INTEGER_VALUE'].includes(err.code)) {
            throw new ProcessorException(`${err.message} at row ${affectedRows}`);
          }
          throw err;
        }
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
