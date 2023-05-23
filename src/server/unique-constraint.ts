import { ColumnRef } from '../parser';
import { ServerError } from './server-error';

export class UniqueConstraint {
  protected index = new Set<string>();

  constructor(
    protected name: string,
    protected columns: ColumnRef[],
  ) {}

  getColumns() {
    return this.columns;
  }

  addValue(value: string) {
    if (this.index.has(value)) {
      throw new ServerError({
        message: `Duplicate entry '${value}' for key '${this.name}'`,
        code: 'DUPLICATE_ENTRY',
      });
    }
    this.index.add(value);
  }

  clearIndex() {
    this.index.clear();
  }
}
