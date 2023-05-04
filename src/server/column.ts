import { Expression } from '../parser';

export class Column {
  constructor(
    protected name: string,
    protected nullable: boolean,
    protected defaultValue: Expression | null,
  ) {}

  getName() {
    return this.name;
  }

  isNullable() {
    return this.nullable;
  }

  getDefaultValueExpression() {
    return this.defaultValue;
  }
}
