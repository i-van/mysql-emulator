import { DeleteQuery, Parser } from '../../src/parser';

describe('delete query', () => {
  const parser = new Parser();

  it('should return DeleteQuery', () => {
    const sql = `DELETE FROM users WHERE name = 'John'`;
    const res = parser.parse(sql, []) as DeleteQuery;

    expect(res).toBeInstanceOf(DeleteQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: '=',
      left: { type: 'column_ref', table: null, column: 'name' },
      right: { type: 'string', value: 'John' },
    });
  });
});
