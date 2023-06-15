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
  concat: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length === 0) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'concat'`);
    }
    return f.args.map((arg) => e.evaluateExpression(arg, row)).join('');
  },
  concat_ws: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length < 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'concat_ws'`);
    }
    const [separator, ...array] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return array.join(separator);
  },
  substring: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2 && f.args?.length !== 3) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'substring'`);
    }
    const [string, start, length] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return length
      ? string.substring(start - 1, start + length - 1)
      : string.substring(start - 1);
  },
  substr: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2 && f.args?.length !== 3) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'substr'`);
    }
    const [string, start, length] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return length
      ? string.substring(start - 1, start + length - 1)
      : string.substring(start - 1);
  },
  substring_index: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 3) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'substring_index'`);
    }
    const [string, delimiter, occurrence] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return string.split(delimiter).slice(0, occurrence).join(delimiter);
  },
  field: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length < 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'field'`);
    }
    const [value, ...array] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return array.indexOf(value) + 1;
  },
  character_length: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'character_length'`);
    }
    return e.evaluateExpression(getArgument(f), row).length;
  },
  char_length: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'char_length'`);
    }
    return e.evaluateExpression(getArgument(f), row).length;
  },
  length: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'length'`);
    }
    return e.evaluateExpression(getArgument(f), row).length;
  },
  lower: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'lower'`);
    }
    return e.evaluateExpression(getArgument(f), row).toLowerCase();
  },
  upper: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function 'upper'`);
    }
    return e.evaluateExpression(getArgument(f), row).toUpperCase();
  },
  now: () => new Date(),
  current_timestamp: () => new Date(),
  current_date: () => {
    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  },
  curdate: () => {
    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  },
  current_time: () => {
    const d = new Date();
    return [
      d.getHours().toString().padStart(2, '0'),
      d.getMinutes().toString().padStart(2, '0'),
      d.getSeconds().toString().padStart(2, '0'),
    ].join(':');
  },
  curtime: () => {
    const d = new Date();
    return [
      d.getHours().toString().padStart(2, '0'),
      d.getMinutes().toString().padStart(2, '0'),
      d.getSeconds().toString().padStart(2, '0'),
    ].join(':');
  },
};
