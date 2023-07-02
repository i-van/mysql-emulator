import { ColumnRef } from '../parser';
import { ServerException } from './server.exception';

export class UniqueConstraint {
  protected index = new Map<string, number>();

  constructor(protected name: string, protected columns: ColumnRef[]) {}

  indexRow(id: number, row: object) {
    const entry = this.buildEntry(row);
    if (this.index.has(entry)) {
      throw new ServerException({
        message: `Duplicate entry '${entry}' for key '${this.name}'`,
        code: 'DUPLICATE_ENTRY',
      });
    }
    this.index.set(entry, id);
  }

  unindexRow(row: object) {
    const entry = this.buildEntry(row);
    const deleted = this.index.delete(entry);
    if (!deleted) {
      throw new ServerException({
        message: `Entry '${entry}' not found for key '${this.name}'`,
        code: 'ENTRY_NOT_FOUND',
      });
    }
  }

  clearIndex() {
    this.index.clear();
  }

  private buildEntry(row: object) {
    return this.columns.map((c) => String(row[c.column])).join('-');
  }
}
