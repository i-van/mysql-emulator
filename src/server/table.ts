import { Column } from './column';

export class Table {
  protected columns: Column[] = [];
  protected rows: object[] = [];

  constructor(protected name: string) {}

  addColumn(c: Column) {
    this.columns.push(c);
  }

  insertRow(data: any) {
    this.rows.push(data);
  }

  getColumns() {
    return this.columns;
  }

  getRows() {
    return this.rows;
  }

  setRows(rows: object[]) {
    this.rows = rows;
  }
}
