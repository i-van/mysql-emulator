import { Parser, UpdateQuery } from '../../src/parser';

describe('update query', () => {
  const parser = new Parser();

  it('should return UpdateQuery', () => {
    const sql = `UPDATE users SET name = 'John' WHERE id = 1`;
    const res = parser.parse(sql, []) as UpdateQuery;

    expect(res).toBeInstanceOf(UpdateQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.assignments).toEqual([
      {
        table: null,
        column: 'name',
        value: {
          type: 'string',
          value: 'John',
        }
      },
    ]);
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: '=',
      left: { type: 'column_ref', table: null, column: 'id' },
      right: { type: 'number', value: 1 },
    });
  });
});
