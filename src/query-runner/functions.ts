import { Expression, FunctionType } from '../parser';
import { EvaluatorException } from './evaluator.exception';
import { Evaluator } from './evaluator';

type FunctionHandler = (e: Evaluator, f: FunctionType, row: object, group: object[]) => any;

const getArgument = (f: FunctionType): Expression => {
  const [arg] = f.args;
  if (!arg) {
    throw new EvaluatorException(`Could not evaluate function '${f.name}'`);
  }
  return arg;
};

export const functions: Record<string, FunctionHandler> = {
  database: (e) => e.getServer().getDatabase(null).getName(),
  version: () => '8.0.0',
  count: (e: Evaluator, f: FunctionType, row: object, group: object[]) => {
    return group.filter((row) => {
      const arg = getArgument(f);
      // count every row when COUNT(*)
      if (arg.type === 'star') {
        return true;
      }
      // count only not nullable fields when COUNT(t.id)
      const value = e.evaluateExpression(arg, row);
      return value !== null && value !== undefined;
    }).length;
  },
  sum: (e: Evaluator, f: FunctionType, row: object, group: object[]) => {
    if (group.length === 0) {
      return null;
    }
    return group
      .reduce((res, row) => res + e.evaluateExpression(getArgument(f), row), 0)
      .toString();
  },
  max: (e: Evaluator, f: FunctionType, row: object, group: object[]) => {
    if (group.length === 0) {
      return null;
    }
    return group.reduce((res, row) => {
      const value = e.evaluateExpression(getArgument(f), row);
      return res > value ? res : value;
    }, e.evaluateExpression(getArgument(f), group[0]));
  },
  min: (e: Evaluator, f: FunctionType, row: object, group: object[]) => {
    if (group.length === 0) {
      return null;
    }
    return group.reduce((res, row) => {
      const value = e.evaluateExpression(getArgument(f), row);
      return res < value ? res : value;
    }, e.evaluateExpression(getArgument(f), group[0]));
  },
  avg: (e: Evaluator, f: FunctionType, row: object, group: object[]) => {
    if (group.length === 0) {
      return null;
    }
    const sum = group.reduce((res, row) => res + e.evaluateExpression(getArgument(f), row), 0);
    return (sum / group.length).toFixed(4);
  },
  now: () => new Date(),
  current_timestamp: () => new Date(),
};
