import { ColumnRef } from '../parser';
import { Table } from './table';

export class ForeignKey {
  constructor(
    protected name: string,
    protected columns: ColumnRef[],
    protected referenceTable: Table,
    protected referenceColumns: ColumnRef[],
  ) {}
}
