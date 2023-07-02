import { Column } from './column';
import { UniqueConstraint } from './unique-constraint';
import { ServerException } from './server.exception';

export class Table {
  protected constraints: UniqueConstraint[] = [];
  protected columns: Column[] = [];
  protected rows = new Map<number, object>();
  protected cursor = 0;

  constructor(protected name: string) {}

  getName(): string {
    return this.name;
  }

  addColumn(c: Column) {
    this.columns.push(c);
  }

  getColumns() {
    return this.columns;
  }

  addConstraint(c: UniqueConstraint) {
    this.constraints.push(c);
  }

  insertRow(row: object) {
    const id = this.cursor++;
    for (const constraint of this.constraints) {
      constraint.indexRow(id, row);
    }
    this.rows.set(id, row);
  }

  updateRow(id: number, newRow: object) {
    const existingRow = this.getRow(id);
    for (const constraint of this.constraints) {
      constraint.unindexRow(existingRow);
      constraint.indexRow(id, newRow);
    }
    this.rows.set(id, newRow);
  }

  deleteRow(id: number) {
    const row = this.getRow(id);
    for (const constraint of this.constraints) {
      constraint.unindexRow(row);
    }
    this.rows.delete(id);
  }

  getRows() {
    return this.rows;
  }

  setRows(rows: object[]) {
    for (const constraint of this.constraints) {
      constraint.clearIndex();
    }
    this.rows.clear();
    for (const row of rows) {
      this.insertRow(row);
    }
  }

  private getRow(id: number) {
    const row = this.rows.get(id);
    if (!row) {
      throw new ServerException({
        message: `Row#${id} not found at '${this.name}' table`,
        code: 'ROW_NOT_FOUND',
      });
    }
    return row;
  }
}
