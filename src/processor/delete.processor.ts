import { Server } from '../server';
import { DeleteQuery } from '../parser';
import { mapKeys } from '../utils';
import { Evaluator } from './evaluator';

export class DeleteProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: DeleteQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.alias || query.table}::${key}`;

    let affectedRows = 0;
    const updatedRows = table.getRows().filter((r) => {
      const row = mapKeys(r, keyMapper);
      const needsRemove = query.where === null || this.evaluator.evaluateExpression(query.where, row);
      if (needsRemove) {
        affectedRows++;
      }
      return !needsRemove;
    });
    table.setRows(updatedRows);

    return { affectedRows };
  }
}
