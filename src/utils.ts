export const mapKeys = (
  o: object,
  mapper: (key: string, value: any) => string,
  filter: (key: string, value: any) => boolean = () => true,
): object => {
  return Object.keys(o).reduce((res, key) => {
    const value = o[key];
    return filter(key, value)
      ? { ...res, [mapper(key, value)]: value }
      : res;
  }, {});
};

export const extractColumn = (key) => {
  const [_table, column] = key.split('::');
  return column;
};

export const extractTable = (key) => {
  const [table, _column] = key.split('::');
  return table;
};
