import { Database, Server } from '../server';
import { TransactionQuery } from '../parser';

export class TransactionProcessor {
  constructor(protected server: Server) {}

  async process({ statement }: TransactionQuery): Promise<void> {
    const db = this.server.getDatabase(null);
    switch (statement) {
      case 'start':
        return this.startTransaction(db);
      case 'commit':
        return this.commitTransaction(db);
      case 'rollback':
        return this.rollbackTransaction(db);
    }
  }

  protected startTransaction(db: Database): Promise<void> {
    let delay = 1;
    const tryToDoSnapshot = (resolve) => {
      if (db.hasSnapshot()) {
        setTimeout(tryToDoSnapshot, delay, resolve);
        delay *= 2;
      } else {
        db.snapshot();
        resolve();
      }
    };
    return new Promise(tryToDoSnapshot);
  }

  protected commitTransaction(db: Database) {
    db.deleteSnapshot();
  }

  protected rollbackTransaction(db: Database) {
    db.restoreSnapshot();
  }
}
