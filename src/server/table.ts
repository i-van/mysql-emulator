import { Column } from './column';
import { UniqueConstraint } from './unique-constraint';

export class Table {
  protected constraints: UniqueConstraint[] = [];
  protected columns: Column[] = [];
  protected rows: object[] = [];

  constructor(protected name: string) {}

  addColumn(c: Column) {
    this.columns.push(c);
  }

  getColumns() {
    return this.columns;
  }

  addConstraint(c: UniqueConstraint) {
    this.constraints.push(c);
  }

  getConstraints() {
    return this.constraints;
  }

  insertRow(row: object) {
    for (const constraint of this.constraints) {
      const indexValue = constraint.getColumns()
        .map((c) => String(row[c.column]))
        .join('-');
      constraint.addValue(indexValue);
    }
    this.rows.push(row);
  }

  getRows() {
    return this.rows;
  }

  setRows(rows: object[]) {
    for (const constraint of this.constraints) {
      constraint.clearIndex();
    }
    this.rows = [];
    for (const row of rows) {
      this.insertRow(row);
    }
  }
}
