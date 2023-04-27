import { BinaryExpression, ColumnRef, Expression, FunctionType, Star } from '../parser';
import { extractColumn, extractTable, mapKeys } from '../utils';
import { Server } from '../server';

export class Evaluator {
  constructor(
    protected server: Server,
    protected fields: string[],
  ) {}

  evaluateExpression(e: Expression, row: object, group: object[] = []): any {
    switch (e.type) {
      case 'unary_expression': return true;
      case 'binary_expression': return this.evaluateBinaryExpression(e, row);
      case 'function': return this.evaluateFunction(e, row, group);
      case 'column_ref': return this.evaluateColumnReference(e, row);
      case 'number': return e.value;
      case 'string': return e.value;
      case 'array': return e.value;
    }
    throw new Error(`Unknown "${e.type}" expression type`);
  };

  evaluateStar(s: Star, row: object): object {
    const filter = (key) => s.table ? s.table === extractTable(key) : true;
    return mapKeys(row, extractColumn, filter);
  }

  protected evaluateBinaryExpression(be: BinaryExpression, row: object): boolean {
    const left = this.evaluateExpression(be.left, row);
    const right = this.evaluateExpression(be.right, row);
    switch (be.operator) {
      case '=': return left == right;
      case 'IN': return right.some((i) => i == left);
      case 'AND': return left && right;
      case 'OR': return left || right;
    }
    throw new Error(`Unknown "${be.operator}" expression type`);
  }

  protected evaluateColumnReference(c: ColumnRef, row: object): any {
    const key = c.table
      ? `${c.table}::${c.column}`
      : Object.keys(row).find(key => extractColumn(key) === c.column);
    if (!key || !this.fields.includes(key)) {
      throw new Error(`Unknown column '${c.column}' in 'field list'`);
    }
    return row[key] || null;
  }

  protected evaluateFunction(f: FunctionType, _row: object, group: object[]): any {
    switch (f.name.toLowerCase()) {
      case 'database': return this.server.getDatabase(null).getName();
      case 'version': return '8.0.0';
      case 'count': return group.length;
      case 'sum': return group.reduce((res, row) => {
        return res + this.evaluateExpression(f.args[0], row);
      }, 0);
      default: throw new Error(`Function ${f.name} is not implemented`);
    }
  };
}
