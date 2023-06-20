import { Expression, FunctionType } from '../parser';
import { EvaluatorException } from './evaluator.exception';
import { Evaluator } from './evaluator';
import { binaryOperators } from './binary-operators';
import { isString, toNumber } from '../utils';

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
    const arg = getArgument(f);
    // count every row when COUNT(*)
    if (arg.type === 'star') {
      return group.length;
    }
    const uniqueValues = new Set<unknown>();
    const values: unknown[] = [];
    group.forEach((row) => {
      // count only not nullable fields when COUNT(t.id)
      const value = e.evaluateExpression(arg, row);
      if (value !== null) {
        uniqueValues.add(value);
        values.push(value);
      }
    });
    return f.options.distinct ? uniqueValues.size : values.length;
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
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    return f.args.map((arg) => e.evaluateExpression(arg, row)).join('');
  },
  concat_ws: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length < 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [separator, ...array] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return array.join(separator);
  },
  substring: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2 && f.args?.length !== 3) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [string, start, length] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return length
      ? string.substring(start - 1, start + length - 1)
      : string.substring(start - 1);
  },
  substring_index: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 3) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [string, delimiter, occurrence] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return string.split(delimiter).slice(0, occurrence).join(delimiter);
  },
  field: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length < 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [value, ...array] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return array.indexOf(value) + 1;
  },
  character_length: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    return e.evaluateExpression(getArgument(f), row).length;
  },
  lower: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    return e.evaluateExpression(getArgument(f), row).toLowerCase();
  },
  upper: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    return e.evaluateExpression(getArgument(f), row).toUpperCase();
  },
  mod: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [left, right] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return binaryOperators['%'](left, right);
  },
  greatest: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length < 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const array = f.args.map((arg) => e.evaluateExpression(arg, row));
    const hasNull = array.some((v) => v === null);
    if (hasNull) {
      return null;
    }
    const hasString = array.some(isString);
    if (hasString) {
      const sorted = array.map(String).sort((a, b) => b.localeCompare(a));
      return sorted[0];
    }
    return Math.max(...array);
  },
  ceiling: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const value = e.evaluateExpression(getArgument(f), row);
    if (value === null) {
      return null;
    }
    return Math.ceil(toNumber(value));
  },
  floor: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const value = e.evaluateExpression(getArgument(f), row);
    if (value === null) {
      return null;
    }
    return Math.floor(toNumber(value));
  },
  round: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1 && f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [value, digits] = f.args.map((arg) => e.evaluateExpression(arg, row));
    if (value === null) {
      return null;
    }
    return toNumber(value).toFixed(digits || 0);
  },
  isnull: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    return Number(e.evaluateExpression(getArgument(f), row) === null);
  },
  ifnull: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [value, alternative] = f.args.map((arg) => e.evaluateExpression(arg, row));
    if (value === null) {
      return alternative;
    }
    return isString(alternative) ? String(value) : value;
  },
  nullif: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [value1, value2] = f.args.map((arg) => e.evaluateExpression(arg, row));
    return value1 == value2 ? null : value1;
  },
  if: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 3) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [condition, value1, value2] = f.args.map((arg) => e.evaluateExpression(arg, row));
    const value = condition ? value1 : value2;
    return isString(value1) || isString(value2) ? String(value) : value;
  },
  coalesce: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length < 1) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const array = f.args.map((arg) => e.evaluateExpression(arg, row));
    return array.find((v) => v !== null) ?? null;
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
  current_time: () => {
    const d = new Date();
    return [
      d.getHours().toString().padStart(2, '0'),
      d.getMinutes().toString().padStart(2, '0'),
      d.getSeconds().toString().padStart(2, '0'),
    ].join(':');
  },
};
const aliases: [string, string][] = [
  ['substring', 'substr'],
  ['character_length', 'char_length'],
  ['character_length', 'length'],
  ['ceiling', 'ceil'],
  ['current_date', 'curdate'],
  ['current_time', 'curtime'],
];
aliases.forEach(([name, alias]) => {
  functions[alias] = functions[name];
});
