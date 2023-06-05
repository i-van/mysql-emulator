import { createHash } from 'crypto';

export const mapKeys = (
  o: object,
  mapper: (key: string, value: any) => string,
  filter: (key: string, value: any) => boolean = () => true,
): object => {
  return Object.keys(o).reduce((res, key) => {
    const value = o[key];
    return filter(key, value) ? { ...res, [mapper(key, value)]: value } : res;
  }, {});
};

export const extractColumn = (key: string): string => {
  const [_table, column] = key.split('::');
  return column;
};

export const extractTable = (key: string): string => {
  const [table, _column] = key.split('::');
  return table;
};

export type SortByKey = {
  mapper: (n: any) => any;
  order: 1 | -1;
};

export const sortBy =
  (keys: SortByKey[]) =>
  (a: any, b: any): 0 | 1 | -1 => {
    const [{ mapper, order }, ...restKeys] = keys;
    const valueA = mapper(a);
    const valueB = mapper(b);

    if (valueA === valueB) {
      return keys.length === 1 ? 0 : sortBy(restKeys)(a, b);
    }

    if (typeof valueA === 'string') {
      return (order * valueA.localeCompare(valueB)) as 1 | -1;
    } else if (typeof valueA === 'number') {
      return valueA > valueB ? order : (-order as 1 | -1);
    } else if (typeof valueA === 'boolean') {
      return valueA ? order : (-order as 1 | -1);
    }
    return 0;
  };

export const md5 = (s: string): string => {
  return createHash('md5').update(s).digest('hex');
};
