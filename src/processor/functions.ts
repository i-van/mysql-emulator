import { Expression, FunctionType, Interval } from '../parser';
import { EvaluatorException } from './evaluator.exception';
import { Evaluator } from './evaluator';
import { binaryOperators } from './binary-operators';
import { isString, toDate, toDateString, toNumber } from '../utils';
import { SelectProcessor } from './select.processor';

type FunctionHandler = (e: Evaluator, f: FunctionType, row: object, group: object[]) => any;

const getArgument = (f: FunctionType): Expression => {
  if (f.args?.length !== 1) {
    throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
  }
  return f.args[0];
};

const applyInterval = (d: Date, i: Interval, k: 1 | -1): void => {
  if (i.unit === 'second') {
    d.setSeconds(d.getSeconds() + k * i.value);
  } else if (i.unit === 'minute') {
    d.setMinutes(d.getMinutes() + k * i.value);
  } else if (i.unit === 'hour') {
    d.setHours(d.getHours() + k * i.value);
  } else if (i.unit === 'day') {
    d.setDate(d.getDate() + k * i.value);
  } else if (i.unit === 'week') {
    d.setDate(d.getDate() + k * i.value * 7);
  } else if (i.unit === 'month') {
    d.setMonth(d.getMonth() + k * i.value);
  } else if (i.unit === 'year') {
    d.setFullYear(d.getFullYear() + k * i.value);
  } else {
    throw new EvaluatorException(`Unknown interval unit '${i.unit}'`);
  }
};

export const functions: Record<string, FunctionHandler> = {
  database: (e) => e.getServer().getDatabase(null).getName(),
  version: () => '8.0.0',
  exists: (e: Evaluator, f: FunctionType, row: object) => {
    const arg = getArgument(f);
    if (arg.type !== 'select') {
      throw new EvaluatorException(`Could not evaluate function '${f.name}'`);
    }

    const p = new SelectProcessor(e.getServer(), arg.query, row);
    const rows = p.process();
    return Number(rows.length > 0);
  },
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
    return group.reduce((res, row) => res + e.evaluateExpression(getArgument(f), row), 0).toString();
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
    return length ? string.substring(start - 1, start + length - 1) : string.substring(start - 1);
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
    return e.evaluateExpression(getArgument(f), row).length;
  },
  lower: (e: Evaluator, f: FunctionType, row: object) => {
    return e.evaluateExpression(getArgument(f), row).toLowerCase();
  },
  upper: (e: Evaluator, f: FunctionType, row: object) => {
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
    const value = e.evaluateExpression(getArgument(f), row);
    if (value === null) {
      return null;
    }
    return Math.ceil(toNumber(value));
  },
  floor: (e: Evaluator, f: FunctionType, row: object) => {
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
  current_date: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
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
  last_day: (e: Evaluator, f: FunctionType, row: object) => {
    const value = e.evaluateExpression(getArgument(f), row);
    const d = toDate(value);
    if (d === null) {
      return null;
    }
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d;
  },
  day: (e: Evaluator, f: FunctionType, row: object) => {
    const value = e.evaluateExpression(getArgument(f), row);
    const d = toDate(value);
    if (d === null) {
      return null;
    }
    return d.getDate();
  },
  date: (e: Evaluator, f: FunctionType, row: object) => {
    const value = e.evaluateExpression(getArgument(f), row);
    const d = toDate(value);
    if (d === null) {
      return null;
    }
    d.setHours(0, 0, 0, 0);
    return d;
  },
  weekday: (e: Evaluator, f: FunctionType, row: object) => {
    const value = e.evaluateExpression(getArgument(f), row);
    const d = toDate(value);
    if (d === null) {
      return null;
    }
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
  },
  datediff: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [date1, date2] = f.args.map((arg) => toDate(e.evaluateExpression(arg, row)));
    if (date1 === null || date2 === null) {
      return null;
    }
    return Math.ceil((date1.getTime() - date2.getTime()) / 86400000);
  },
  date_add: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [valueArg, interval] = f.args;
    if (interval.type !== 'interval') {
      throw new EvaluatorException(`Could not evaluate function '${f.name}'`);
    }
    const d = toDate(e.evaluateExpression(valueArg, row));
    if (d === null) {
      return null;
    }
    applyInterval(d, interval, 1);
    return toDateString(d);
  },
  date_sub: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [valueArg, interval] = f.args;
    if (interval.type !== 'interval') {
      throw new EvaluatorException(`Could not evaluate function '${f.name}'`);
    }
    const d = toDate(e.evaluateExpression(valueArg, row));
    if (d === null) {
      return null;
    }
    applyInterval(d, interval, -1);
    return toDateString(d);
  },
  date_format: (e: Evaluator, f: FunctionType, row: object) => {
    if (f.args?.length !== 2) {
      throw new EvaluatorException(`Incorrect parameter count in the call to native function '${f.name}'`);
    }
    const [value, format] = f.args.map((arg) => e.evaluateExpression(arg, row));
    const d = toDate(value);
    if (d === null) {
      return null;
    }

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const hours = d.getHours();
    const standardHours = hours === 0 ? 12 : hours % 12;
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const milliseconds= d.getMilliseconds();
    const meridiem = hours < 13 ? 'AM' : 'PM';
    return Object.entries({
      Y: year,
      y: year.toString().substring(2),

      M: d.toLocaleString('default', { month: 'long' }),
      b: d.toLocaleString('default', { month: 'short' }),
      c: month,
      m: month.toString().padStart(2, '0'),

      D: [1, 21, 31].includes(date) ? `${date}st`
        : [2, 22].includes(date) ? `${date}nd`
          : [3, 23].includes(date) ? `${date}rd`
            : `${date}th`,
      d: date.toString().padStart(2, '0'),
      e: date,

      H: hours.toString().padStart(2, '0'),
      h: standardHours.toString().padStart(2, '0'),
      I: standardHours.toString().padStart(2, '0'),
      k: hours,
      l: standardHours,
      p: meridiem,

      i: minutes.toString().padStart(2, '0'),

      S: seconds.toString().padStart(2, '0'),
      s: seconds.toString().padStart(2, '0'),

      f: milliseconds.toString().padStart(3, '0') + '000',

      r: [standardHours, minutes, seconds]
        .map((n) => n.toString().padStart(2, '0'))
        .join(':') + ' ' + meridiem,
      T: [hours, minutes, seconds]
        .map((n) => n.toString().padStart(2, '0'))
        .join(':'),

      w: d.getDay(),
      W: d.toLocaleDateString('default', { weekday: 'long' }),
      a: d.toLocaleDateString('default', { weekday: 'short' }),
      j: Math.floor((d.getTime() - new Date(year, 0, 0).getTime()) / 864e5).toString().padStart(3, '0'),
    }).reduce((res, [key, value]) => res.replace('%' + key, value), format);
  },
};
const aliases: [string, string][] = [
  ['substring', 'substr'],
  ['character_length', 'char_length'],
  ['character_length', 'length'],
  ['ceiling', 'ceil'],
  ['now', 'current_timestamp'],
  ['current_date', 'curdate'],
  ['current_time', 'curtime'],
  ['day', 'dayofmonth'],
];
aliases.forEach(([name, alias]) => {
  functions[alias] = functions[name];
});
