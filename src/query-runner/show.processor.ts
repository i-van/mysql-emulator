import { Server } from '../server';
import { ShowQuery } from '../parser';
import { ProcessorException } from './processor.exception';

export class ShowProcessor {
  constructor(protected server: Server) {}

  process({ statement }: ShowQuery): any[] {
    switch (statement) {
      case 'databases':
        const databaseNames = this.server.getDatabaseNames();
        return databaseNames.map((d) => ({ 'Database': d }));
      case 'tables':
        const db = this.server.getDatabase(null);
        const tableNames = db.getTableNames();
        return tableNames.map((t) => ({ [`Tables_in_${db.getName()}`]: t }));
      case 'indexes':
        return [];
    }
    throw new ProcessorException(`Unknown statement '${statement}'`);
  }
}
