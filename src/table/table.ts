import { DataType, TableColumn } from './table-column';

export class Table {
  protected columns: TableColumn[] = [];
  protected rows: any[] = [];

  constructor(protected name: string) {}

  addColumn(name: string, type: DataType) {
    this.columns.push(new TableColumn(name, type));
  }

  // todo: verify if data matches columns
  insertRow(data: any) {
    this.rows.push(data);
  }

  getRows() {
    return this.rows;
  }
}
