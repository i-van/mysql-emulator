import { Column, Server } from '../server';
import { UpdateQuery } from '../parser';
import { mapKeys } from '../utils';
import { Evaluator } from './evaluator';
import { ProcessorError } from './processor-error';

export class UpdateProcessor {
  constructor(protected server: Server) {}

  process(query: UpdateQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const columns = table.getColumns().map(c => `${query.table}::${c.getName()}`);
    const columnDefinitions = table.getColumns();
    const columnDefinitionMap = new Map<string, Column>(
      columnDefinitions.map((c) => [c.getName(), c])
    );
    const evaluator = new Evaluator(this.server, columns);
    const getColumnDefinition = (column: string): Column => {
      const c = columnDefinitionMap.get(column);
      if (!c) {
        throw new ProcessorError(`Unknown column '${column}' in 'field list'`);
      }
      return c;
    };

    let affectedRows = 0;
    const updatedRows = table.getRows().map(r => {
      const row = mapKeys(r, (key) => `${query.table}::${key}`);
      const needsUpdate = query.where === null || evaluator.evaluateExpression(query.where, row);
      if (!needsUpdate) {
        return r;
      }

      affectedRows++;
      return query.assignments.reduce((res, a) => {
        const column = getColumnDefinition(a.column);
        const value = evaluator.evaluateExpression(a.value, row);
        try {
          return {
            ...res,
            [column.getName()]: column.cast(value),
          }
        } catch (err: any) {
          if (['OUT_OF_RANGE_VALUE', 'INCORRECT_INTEGER_VALUE'].includes(err.code)) {
            throw new ProcessorError(`${err.message} at row ${affectedRows}`);
          }
          throw err;
        }
      }, r);
    });
    table.setRows(updatedRows);

    return { affectedRows };
  }
}
