import { Column } from '../column';
import { Expression } from '../../parser';
import { ServerException } from '../server.exception';

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

  cast(value: any): number {
    if (value > this.getMaxValue() || value < this.getMinValue()) {
      throw new ServerException({
        message: `Out of range value for column '${this.name}'`,
        code: 'OUT_OF_RANGE_VALUE',
      });
    }
    if (isNaN(+value)) {
      throw new ServerException({
        message: `Incorrect integer value: '${value}' for column '${this.name}'`,
        code: 'INCORRECT_INTEGER_VALUE',
      });
    }

    return +value;
  }

  getMinValue() {
    return this.unsigned ? 0 : (-2) ** (this.exponent - 1);
  }

  getMaxValue() {
    return this.unsigned ? 2 ** this.exponent - 1 : 2 ** (this.exponent - 1) - 1;
  }

  hasAutoIncrement() {
    return this.autoIncrement;
  }

  getAutoIncrementCursor() {
    return this.autoIncrementCursor;
  }

  setAutoIncrementCursor(n: number) {
    this.autoIncrementCursor = n;
  }
}
