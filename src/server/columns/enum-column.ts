import { Column } from '../column';
import { Expression } from '../../parser';

export class EnumColumn extends Column {
  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected enumValues: Expression,
  ) {
    super(name, nullable, defaultValue);
  }
}
