import { Column } from './column';
import { UniqueKey } from './unique-key';
import { ServerException } from './server.exception';
import { ForeignKey } from './foreign-key';

export class Table {
  protected foreignKeys: ForeignKey[] = [];
  protected uniqueKeys: UniqueKey[] = [];
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

  addForeignKey(fk: ForeignKey) {
    this.foreignKeys.push(fk);
  }

  addUniqueKey(uk: UniqueKey) {
    this.uniqueKeys.push(uk);
  }

  insertRow(row: object) {
    const id = ++this.cursor;
    for (const uniqueKey of this.uniqueKeys) {
      uniqueKey.indexRow(id, row);
    }
    for (const foreignKey of this.foreignKeys) {
      foreignKey.checkReference(row);
    }
    this.rows.set(id, row);
  }

  updateRow(id: number, newRow: object) {
    const existingRow = this.getRow(id);
    for (const uniqueKey of this.uniqueKeys) {
      uniqueKey.unindexRow(existingRow);
      uniqueKey.indexRow(id, newRow);
    }
    for (const foreignKey of this.foreignKeys) {
      foreignKey.checkReference(newRow);
    }
    this.rows.set(id, newRow);
  }

  deleteRow(id: number) {
    const row = this.getRow(id);
    for (const uniqueKey of this.uniqueKeys) {
      uniqueKey.unindexRow(row);
    }
    this.rows.delete(id);
  }

  getRows() {
    return this.rows;
  }

  setRows(rows: object[]) {
    for (const uniqueKey of this.uniqueKeys) {
      uniqueKey.clearIndex();
    }
    this.rows.clear();
    for (const row of rows) {
      this.insertRow(row);
    }
  }

  getRow(id: number) {
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
