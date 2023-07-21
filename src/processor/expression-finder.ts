import { Expression } from '../parser';
import { ProcessorException } from './processor.exception';

export const findExpression = <T extends Expression>(e: Expression, p: (e: Expression) => e is T): T | undefined => {
  if (p(e)) {
    return e;
  }
  switch (e.type) {
    case 'select':
      if (e.query.where && p(e.query.where)) {
        return e.query.where;
      } else if (e.query.having && p(e.query.having)) {
        return e.query.having;
      } else {
        return;
      }
    case 'unary_expression':
      return findExpression(e.expression, p);
    case 'binary_expression':
      return [e.left, e.right].find(p);
    case 'case':
      if (e.else && p(e.else)) {
        return e.else;
      } else {
        return e.when.flatMap((w) => [w.condition, w.value]).find(p);
      }
    case 'function':
      return e.args.find(p);
    case 'star':
    case 'column_ref':
    case 'number':
    case 'string':
    case 'boolean':
    case 'array':
    case 'null':
      return;
  }
  throw new ProcessorException(`Unknown expression type '${e.type}'`);
};
