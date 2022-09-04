import { Column } from 'node-sql-parser/types';
import { DataType, TableColumn } from './table-column';

type Columns = any[] | Column[] | '*';

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

  selectRows(columns: Columns) {
    return this.rows.map((row) => {
      if (columns === '*') {
        return row;
      }
      // todo remove any
      return (columns as any).reduce((r, c) => {
        if (c.expr.column === '*') {
          return { ...r, ...row };
        }
        return {
          ...r,
          [c.as || c.expr.column]: row[c.expr.column],
        };
      }, {});
    });
  }
}
