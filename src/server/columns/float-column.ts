import { Column } from '../column';
import { Expression } from '../../parser';

export class FloatColumn extends Column {
  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected unsigned: boolean,
  ) {
    super(name, nullable, defaultValue);
  }

  compareTo(c: Column): boolean {
    return c instanceof FloatColumn && this.unsigned === c.unsigned;
  }
}
