import { Server } from '../server';
import { ShowQuery } from '../parser';
import { ProcessorException } from './processor.exception';

export class ShowProcessor {
  constructor(protected server: Server) {}

  process({ statement }: ShowQuery): any[] {
    switch (statement) {
      case 'databases':
        return this.server.getDatabaseNames();
      case 'tables':
        return this.server.getDatabase(null).getTableNames();
      case 'indexes':
        return [];
    }
    throw new ProcessorException(`Unknown statement '${statement}'`);
  }
}
