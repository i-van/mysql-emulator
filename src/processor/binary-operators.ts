import { toNumber } from '../utils';

export const binaryOperators: Record<string, (left, right) => any> = {
  '=': (left, right) => Number(left == right),
  '!=': (left, right) => Number(left != right),
  '<>': (left, right) => Number(left != right),
  'IN': (left, right) => Number(right.some((i) => i == left)),
  'NOT IN': (left, right) => Number(right.every((i) => i != left)),
  'BETWEEN': (left, right) => Number(left >= right[0] && left <= right[1]),
  'LIKE': (left, right) => {
    const r = new RegExp('^' + right.replace(/_/g, '.').replace(/%/g, '.*') + '$');
    return Number(r.test(left));
  },
  'AND': (left, right) => Number(left && right),
  'OR': (left, right) => Number(left || right),
  'IS': (left, right) => Number(left == right),
  'IS NOT': (left, right) => Number(left != right),
  '>': (left, right) => Number(left > right),
  '>=': (left, right) => Number(left >= right),
  '<': (left, right) => Number(left < right),
  '<=': (left, right) => Number(left <= right),
  '%': (left, right) => {
    const convertedLeft = toNumber(left);
    const convertedRight = toNumber(right);
    if (convertedRight === 0) {
      return null;
    }
    return convertedLeft % convertedRight;
  },
  '+': (left, right) => toNumber(left) + toNumber(right),
  '-': (left, right) => toNumber(left) - toNumber(right),
  '*': (left, right) => toNumber(left) * toNumber(right),
  '/': (left, right) => {
    const convertedLeft = toNumber(left);
    const convertedRight = toNumber(right);
    if (convertedRight === 0) {
      return null;
    }
    if (convertedLeft === 0 && left !== convertedLeft) {
      return 0;
    }
    return (convertedLeft / convertedRight).toFixed(4);
  },
};
