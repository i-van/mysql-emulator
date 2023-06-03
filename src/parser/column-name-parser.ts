const columnRegExp = /select(.*?)(from|$)/i;
const aliasRegExp = /\s+(as\s+)?(`?\w+`?)$/i;
const stringRegExp = /^['"](\w+)['"]$/i;

const trimParentheses = (s: string): string => {
  const trimmed = s.trim();
  if (trimmed[0] === '(') {
    return trimmed.replace(/^\(/, '').replace(/\)$/, '');
  }
  return trimmed;
};

// todo: grab this from node-sql-parser
export const parseColumnNames = (sql: string): string[] => {
  const parts = trimParentheses(sql).match(columnRegExp) || [];
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
