const columnRegExp = /select(.*?)(from|$)/i;
const aliasRegExp = /\s+(as\s+)?(`?\w+`?)$/i;
const stringRegExp = /^['"](\w+)['"]$/i;

// todo: grab this from node-sql-parser
export const parseColumnNames = (sql: string): string[] => {
  const parts = sql.match(columnRegExp) || [];
  const columns = (parts[1] || '').trim().split(',');

  return columns.map((c) => {
    const name = c.trim().replace(aliasRegExp, '');
    if (name.toLowerCase() === 'null') {
      return 'NULL';
    }
    if (stringRegExp.test(name)) {
      return name.replace(stringRegExp, '$1');
    }

    return name;
  });
};
