import { Column } from '../column';
import { Expression } from '../../parser';

export class StringColumn extends Column {
  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected length: number,
  ) {
    super(name, nullable, defaultValue);
  }
}
