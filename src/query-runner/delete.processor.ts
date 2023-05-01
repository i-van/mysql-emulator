import { Server } from '../server';
import { DeleteQuery } from '../parser';
import { mapKeys } from '../utils';
import { Evaluator } from './evaluator';

export class DeleteProcessor {
  constructor(protected server: Server) {}

  process(query: DeleteQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const columns = table.getColumns().map(c => `${query.table}::${c.getName()}`);
    const evaluator = new Evaluator(this.server, columns);

    let affectedRows = 0;
    const updatedRows = table.getRows().filter(r => {
      const row = mapKeys(r, (key) => `${query.table}::${key}`);
      const remove = query.where === null || evaluator.evaluateExpression(query.where, row);
      if (remove) {
        affectedRows++;
      }
      return !remove;
    });
    table.setRows(updatedRows);

    return affectedRows;
  }
}
