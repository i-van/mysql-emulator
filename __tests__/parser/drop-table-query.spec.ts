import { DropTableQuery, Parser } from '../../src/parser';

describe('drop table query', () => {
  const parser = new Parser();

  it('should return DropTableQuery', () => {
    const sql = 'DROP TABLE users';
    const res = parser.parse(sql, []) as DropTableQuery;

    expect(res).toBeInstanceOf(DropTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
  });
});
