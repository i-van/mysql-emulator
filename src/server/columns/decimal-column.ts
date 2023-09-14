import { Column } from '../column';
import { Expression } from '../../parser';

export class DecimalColumn extends Column {
  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected unsigned: boolean,
  ) {
    super(name, nullable, defaultValue);
  }

  compareTo(c: Column): boolean {
    return c instanceof DecimalColumn
      && this.unsigned === c.unsigned;
  }
}
