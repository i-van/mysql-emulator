import { Server } from '../server';
import { UpdateQuery } from '../parser';
import { mapKeys } from '../utils';
import { Evaluator } from './evaluator';

export class UpdateProcessor {
  constructor(protected server: Server) {}

  process(query: UpdateQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const columns = table.getColumns().map(c => `${query.table}::${c.getName()}`);
    const evaluator = new Evaluator(this.server, columns);

    let affectedRows = 0;
    const updatedRows = table.getRows().map(r => {
      const row = mapKeys(r, (key) => `${query.table}::${key}`);
      const update = query.where === null || evaluator.evaluateExpression(query.where, row);
      if (update) {
        affectedRows++;
        return query.assignments.reduce((res, a) => ({
          ...res,
          [a.column]: evaluator.evaluateExpression(a.value, row),
        }), r);
      } else {
        return r;
      }
    });
    table.setRows(updatedRows);

    return { affectedRows };
  }
}
