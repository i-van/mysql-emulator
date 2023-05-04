import { Column } from '../column';
import { Expression } from '../../parser';

export class IntColumn extends Column {
  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected unsigned: boolean,
    protected autoIncrement: boolean,
  ) {
    super(name, nullable, defaultValue);
  }
}
