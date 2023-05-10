import { BinaryExpression, ColumnRef, Expression, FunctionType, Star } from '../parser';
import { extractColumn, extractTable, mapKeys } from '../utils';
import { Server } from '../server';

export class Evaluator {
  constructor(
    protected server: Server,
    protected columns: string[],
  ) {}

  evaluateExpression(e: Expression, row: object, group: object[] = []): any {
    switch (e.type) {
      // todo: handle 'unary_expression'
      case 'binary_expression': return this.evaluateBinaryExpression(e, row);
      case 'function': return this.evaluateFunction(e, row, group);
      case 'column_ref': return this.evaluateColumnReference(e, row);
      case 'number': return e.value;
      case 'string': return e.value;
      case 'array': return e.value;
      case 'null': return null;
    }
    throw new Error(`Unknown "${e.type}" expression type`);
  };

  evaluateStar(s: Star, row: object): object {
    const filter = (key) => s.table ? s.table === extractTable(key) : true;
    return mapKeys(row, extractColumn, filter);
  }

  protected evaluateBinaryExpression(be: BinaryExpression, row: object): any {
    const left = this.evaluateExpression(be.left, row);
    const right = this.evaluateExpression(be.right, row);
    switch (be.operator) {
      case '=': return left == right;
      case 'IN': return right.some((i) => i == left);
      case 'AND': return left && right;
      case 'OR': return left || right;
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
    }
    throw new Error(`Unknown "${be.operator}" expression type`);
  }

  protected evaluateColumnReference(c: ColumnRef, row: object): any {
    const key = c.table
      ? `${c.table}::${c.column}`
      : Object.keys(row).find(key => extractColumn(key) === c.column);
    if (!key || !this.columns.includes(key)) {
      throw new Error(`Unknown column '${c.column}' in 'field list'`);
    }
    return row[key] || null;
  }

  protected evaluateFunction(f: FunctionType, _row: object, group: object[]): any {
    switch (f.name.toLowerCase()) {
      case 'database': return this.server.getDatabase(null).getName();
      case 'version': return '8.0.0';
      case 'count': return group.filter((row) => {
        const [arg] = f.args;
        if (!arg) {
          throw new Error(`Could not evaluate "${f.name}" function`);
        }
        // count every row when COUNT(*)
        if (arg.type === 'star') {
          return true;
        }
        // count only not nullable fields when COUNT(t.id)
        const value = this.evaluateExpression(arg, row);
        return value !== null && value !== undefined;
      }).length;
      case 'sum': return group.reduce((res, row) => {
        const [arg] = f.args;
        if (!arg) {
          throw new Error(`Could not evaluate "${f.name}" function`);
        }
        return res + this.evaluateExpression(arg, row);
      }, 0).toString();
      default: throw new Error(`Function ${f.name} is not implemented`);
    }
  };
}
