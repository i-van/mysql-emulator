import { DropTableQuery, Parser } from '../../src/parser';

describe('drop table query', () => {
  const parser = new Parser();

  it('should return DropTableQuery', () => {
    const sql = 'DROP TABLE users';
    const res = parser.parse(sql, []) as DropTableQuery;

    expect(res).toBeInstanceOf(DropTableQuery);
    expect(res.database).toBe(null);
    expect(res.ifExists).toBe(false);
    expect(res.table).toBe('users');
  });
  it('should return DropTableQuery', () => {
    const sql = 'DROP TABLE IF EXISTS users';
    const res = parser.parse(sql, []) as DropTableQuery;

    expect(res).toBeInstanceOf(DropTableQuery);
    expect(res.database).toBe(null);
    expect(res.ifExists).toBe(true);
    expect(res.table).toBe('users');
  });
});
