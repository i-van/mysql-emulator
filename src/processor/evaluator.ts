import { BinaryExpression, CaseType, ColumnRef, Expression, FunctionType, SubQuery, UnaryExpression } from '../parser';
import { extractColumn, toNumber } from '../utils';
import { Server } from '../server';
import { EvaluatorException } from './evaluator.exception';
import { SelectProcessor } from './select.processor';
import { binaryOperators } from './binary-operators';
import { SubQueryException } from './sub-query.exception';
import { functions } from './functions';

export class Evaluator {
  constructor(protected server: Server, protected context: object = {}) {}

  getServer() {
    return this.server;
  }

  evaluateExpression(e: Expression, row: object, group: object[] = []): any {
    const rowWithContext = { ...row, ...this.context };
    switch (e.type) {
      case 'select':
        return this.evaluateSelectExpression(e, rowWithContext);
      case 'unary_expression':
        return this.evaluateUnaryExpression(e, rowWithContext, group);
      case 'binary_expression':
        return this.evaluateBinaryExpression(e, rowWithContext, group);
      case 'case':
        return this.evaluateCaseExpression(e, rowWithContext, group);
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

  protected evaluateUnaryExpression(ue: UnaryExpression, row: object, group: object[]): any {
    const value = this.evaluateExpression(ue.expression, row, group);
    switch (ue.operator) {
      case 'NOT':
        return Number(!value);
      case '-':
        if (value === null) {
          return null;
        } else if (value === 0) {
          return 0;
        } else {
          return -toNumber(value);
        }
    }
    throw new EvaluatorException(`Unknown operator '${ue.operator}'`);
  }

  protected evaluateBinaryExpression(be: BinaryExpression, row: object, group: object[]): any {
    const handler = binaryOperators[be.operator];
    if (!handler) {
      throw new EvaluatorException(`Unknown operator '${be.operator}'`);
    }

    const left = this.evaluateExpression(be.left, row, group);
    const right = this.evaluateExpression(be.right, row, group);
    return handler(left, right);
  }

  protected evaluateCaseExpression(c: CaseType, row: object, group: object[]): any {
    for (const { condition, value } of c.when) {
      if (this.evaluateExpression(condition, row, group)) {
        return this.evaluateExpression(value, row, group);
      }
    }
    return c.else ? this.evaluateExpression(c.else, row, group) : null;
  }

  protected evaluateColumnReference(c: ColumnRef, row: object): any {
    const key = c.table ? `${c.table}::${c.column}` : Object.keys(row).find((key) => extractColumn(key) === c.column);
    if (!key || !(key in row)) {
      const columnName = c.table ? `${c.table}.${c.column}` : c.column;
      throw new EvaluatorException(`Unknown column '${columnName}'`);
    }
    return row[key];
  }

  protected evaluateFunction(f: FunctionType, row: object, group: object[]): any {
    const handler = functions[f.name];
    if (!handler) {
      throw new EvaluatorException(`Function '${f.name}' is not implemented`);
    }

    return handler(this, f, row, group);
  }
}
