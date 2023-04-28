import { InsertQuery, Parser } from '../../src/parser';

describe('insert query', () => {
  const parser = new Parser();

  it('should return InsertQuery', () => {
    const sql = `INSERT INTO users (id, name) VALUES (1, 'name1'), (2, 'name2'), (3, 'name3')`;
    const res = parser.parse(sql, []) as InsertQuery;

    expect(res).toBeInstanceOf(InsertQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.rows).toEqual([
      { id: 1, name: 'name1' },
      { id: 2, name: 'name2' },
      { id: 3, name: 'name3' },
    ]);
  });
});
