import { ColumnRef } from '../parser';
import { Table } from './table';
import { ServerException } from './server.exception';

const formatColumnNames = (columns: ColumnRef[]): string => {
  return columns.map((c) => '`' + c.column + '`').join(', ');
};

export class ForeignKey {
  constructor(
    protected name: string,
    protected table: Table,
    protected columns: ColumnRef[],
    protected referenceTable: Table,
    protected referenceColumns: ColumnRef[],
  ) {}

  checkReference(row: object): void {
    const values = this.columns.map((c) => row[c.column]);
    for (const [_id, referencedRow] of this.referenceTable.getRows()) {
      const match = this.referenceColumns.every((c, i) => {
        return referencedRow[c.column] === values[i];
      });
      if (match) {
        return;
      }
    }
    throw new ServerException({
      message: `Cannot add or update a child row: `
        + `a foreign key constraint fails (\`${this.table.getName()}\`, CONSTRAINT \`${this.name}\` `
        + `FOREIGN KEY (${formatColumnNames(this.columns)}) `
        + `REFERENCES \`${this.referenceTable.getName()}\` (${formatColumnNames(this.referenceColumns)}))`,
      code: 'REFERENCE_NOT_FOUND',
    })
  }
}
