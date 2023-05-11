import { Column } from '../column';
import { Expression } from '../../parser';

export class IntegerColumn extends Column {
  private autoIncrementCursor = 0;

  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected unsigned: boolean,
    protected autoIncrement: boolean,
    protected exponent = 32,
  ) {
    super(name, nullable, defaultValue);
  }

  getMinValue() {
    return this.unsigned
      ? 0
      : (-2) ** (this.exponent - 1);
  }

  getMaxValue() {
    return this.unsigned
      ? 2 ** this.exponent - 1
      : 2 ** (this.exponent - 1) - 1;
  }

  hasAutoIncrement() {
    return this.autoIncrement;
  }

  getNextAutoIncrementValue() {
    return ++this.autoIncrementCursor;
  }
}
