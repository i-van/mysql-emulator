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

// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
export const hashCode = (s: string): number => {
  let hash = 0;
  for (let i = 0, l = s.length; i < l; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
};

export const toNumber = (n: any): number => {
  const converted = Number(n);
  if (isNaN(converted)) {
    return 0;
  }
  return converted;
};
