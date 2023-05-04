import { CreateColumn, Expression } from '../parser';
import { IntColumn } from './columns/int-column';
import { VarcharColumn } from './columns/varchar-column';

export class Column {
  constructor(
    protected name: string,
    protected nullable: boolean,
    protected defaultValue: Expression | null,
  ) {}

  getName() {
    return this.name;
  }
}
