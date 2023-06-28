import { Column } from '../column';
import { Expression } from '../../parser';
import { toDate } from '../../utils';

export class DateColumn extends Column {
  constructor(
    name: string,
    nullable: boolean,
    defaultValue: Expression | null,
    protected onUpdateCurrentTimestamp: boolean,
  ) {
    super(name, nullable, defaultValue);
  }

  cast(value: any): Date | null {
    return toDate(value);
  }

  hasOnUpdateCurrentTimestamp() {
    return this.onUpdateCurrentTimestamp;
  }
}
