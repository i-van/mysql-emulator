import { DeleteQuery, Parser } from '../../src/parser';

describe('delete query', () => {
  const parser = new Parser();

  it('should return DeleteQuery', () => {
    const sql = `DELETE FROM users WHERE name = 'John'`;
    const res = parser.parse(sql, []) as DeleteQuery;

    expect(res).toBeInstanceOf(DeleteQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.alias).toBe(null);
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: '=',
      left: { type: 'column_ref', table: null, column: 'name' },
      right: { type: 'string', value: 'John' },
    });
  });
  it('should parse ORDER BY and LIMIT', () => {
    const sql = `DELETE FROM users u ORDER BY u.id, u.name DESC LIMIT 5`;
    const res = parser.parse(sql, []) as DeleteQuery;

    expect(res).toBeInstanceOf(DeleteQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.alias).toBe('u');
    expect(res.orderBy).toEqual([
      {
        type: 'column_ref',
        table: 'u',
        column: 'id',
        order: 'ASC',
      },
      {
        type: 'column_ref',
        table: 'u',
        column: 'name',
        order: 'DESC',
      },
    ]);
    expect(res.limit).toBe(5);
  });
});
