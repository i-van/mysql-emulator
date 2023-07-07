import { Parser, ReplaceQuery } from '../../src/parser';

describe('replace query', () => {
  const parser = new Parser();

  it('should return ReplaceQuery', () => {
    const sql = `REPLACE INTO students (id, name, year) VALUES (1, 'John', DEFAULT)`;
    const res = parser.parse(sql, []) as ReplaceQuery;

    expect(res).toBeInstanceOf(ReplaceQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('students');
    expect(res.columns).toEqual(['id', 'name', 'year']);
    expect(res.values).toEqual([
      [{ type: 'number', value: 1 }, { type: 'string', value: 'John' }, { type: 'default' }],
    ]);
  });
  it('should return null columns', () => {
    const sql = `REPLACE INTO students VALUES (1, 'John', DEFAULT)`;
    const res = parser.parse(sql, []) as ReplaceQuery;

    expect(res).toBeInstanceOf(ReplaceQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('students');
    expect(res.columns).toEqual(null);
    expect(res.values).toEqual([
      [{ type: 'number', value: 1 }, { type: 'string', value: 'John' }, { type: 'default' }],
    ]);
  });
});
