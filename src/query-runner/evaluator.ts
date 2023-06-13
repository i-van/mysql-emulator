import { BinaryExpression, ColumnRef, Expression, FunctionType, Star, SubQuery, UnaryExpression } from '../parser';
import { extractColumn, extractTable, mapKeys } from '../utils';
import { Server } from '../server';
import { EvaluatorException } from './evaluator.exception';
import { SelectProcessor } from './select.processor';
import { binaryOperators } from './binary-operators';
import { SubQueryException } from './sub-query.exception';

export class Evaluator {
  constructor(protected server: Server, protected context: object = {}) {}

  evaluateExpression(e: Expression, row: object, group: object[] = []): any {
    const rowWithContext = { ...row, ...this.context };
    switch (e.type) {
      case 'select':
        return this.evaluateSelectExpression(e, rowWithContext);
      case 'unary_expression':
        return this.evaluateUnaryExpression(e, rowWithContext);
      case 'binary_expression':
        return this.evaluateBinaryExpression(e, rowWithContext);
      case 'function':
        return this.evaluateFunction(e, rowWithContext, group);
      case 'column_ref':
        return this.evaluateColumnReference(e, rowWithContext);
      case 'number':
        return e.value;
      case 'string':
        return e.value;
      case 'boolean':
        return Number(e.value);
      case 'array':
        return e.value;
      case 'null':
        return null;
    }
    throw new EvaluatorException(`Unknown expression type '${e.type}'`);
  }

  evaluateStar(s: Star, row: object): object {
    const filter = (key) => (s.table ? s.table === extractTable(key) : true);
    return mapKeys(row, extractColumn, filter);
  }

  protected evaluateSelectExpression(e: SubQuery & { isArray: boolean }, row: object): any {
    const p = new SelectProcessor(this.server, e.query, row);
    const rows = p.process();

    const getFirstField = (row: object) => {
      const keys = Object.keys(row);
      if (keys.length !== 1) {
        throw new SubQueryException('Operand should contain 1 column(s)');
      }
      return row[keys[0]];
    };
    if (e.isArray) {
      return rows.map(getFirstField);
    }
    if (rows.length === 0) {
      return null;
    } else if (rows.length === 1) {
      return getFirstField(rows[0]);
    } else {
      throw new SubQueryException('Subquery returns more than 1 row');
    }
  }

  protected evaluateUnaryExpression(ue: UnaryExpression, row: object): any {
    const value = this.evaluateExpression(ue.expression, row);
    switch (ue.operator) {
      case 'NOT':
        return Number(!value);
    }
    throw new EvaluatorException(`Unknown operator '${ue.operator}'`);
  }

  protected evaluateBinaryExpression(be: BinaryExpression, row: object): any {
    const handler = binaryOperators[be.operator];
    if (!handler) {
      throw new EvaluatorException(`Unknown operator '${be.operator}'`);
    }

    const left = this.evaluateExpression(be.left, row);
    const right = this.evaluateExpression(be.right, row);
    return handler(left, right);
  }

  protected evaluateColumnReference(c: ColumnRef, row: object): any {
    const key = c.table ? `${c.table}::${c.column}` : Object.keys(row).find((key) => extractColumn(key) === c.column);
    if (!key || !(key in row)) {
      const columnName = c.table ? `${c.table}.${c.column}` : c.column;
      throw new EvaluatorException(`Unknown column '${columnName}'`);
    }
    return row[key];
  }

  protected evaluateFunction(f: FunctionType, _row: object, group: object[]): any {
    const getArgument = (): Expression => {
      const [arg] = f.args;
      if (!arg) {
        throw new EvaluatorException(`Could not evaluate function '${f.name}'`);
      }
      return arg;
    };
    switch (f.name) {
      case 'database':
        return this.server.getDatabase(null).getName();
      case 'version':
        return '8.0.0';
      case 'count':
        return group.filter((row) => {
          const arg = getArgument();
          // count every row when COUNT(*)
          if (arg.type === 'star') {
            return true;
          }
          // count only not nullable fields when COUNT(t.id)
          const value = this.evaluateExpression(arg, row);
          return value !== null && value !== undefined;
        }).length;
      case 'sum':
        if (group.length === 0) {
          return null;
        }
        return group
          .reduce((res, row) => {
            return res + this.evaluateExpression(getArgument(), row);
          }, 0)
          .toString();
      case 'max': {
        if (group.length === 0) {
          return null;
        }
        return group.reduce((res, row) => {
          const value = this.evaluateExpression(getArgument(), row);
          return res > value ? res : value;
        }, this.evaluateExpression(getArgument(), group[0]));
      }
      case 'min': {
        if (group.length === 0) {
          return null;
        }
        return group.reduce((res, row) => {
          const value = this.evaluateExpression(getArgument(), row);
          return res < value ? res : value;
        }, this.evaluateExpression(getArgument(), group[0]));
      }
      case 'avg': {
        if (group.length === 0) {
          return null;
        }
        const sum = group.reduce((res, row) => {
          return res + this.evaluateExpression(getArgument(), row);
        }, 0);
        return (sum / group.length).toFixed(4);
      }
      case 'now':
      case 'current_timestamp':
        return new Date();
      default:
        throw new EvaluatorException(`Function '${f.name}' is not implemented`);
    }
  }
}
