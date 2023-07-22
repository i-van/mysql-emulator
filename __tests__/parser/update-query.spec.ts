import { Parser, UpdateQuery } from '../../src/parser';

describe('update query', () => {
  const parser = new Parser();

  it('should return UpdateQuery', () => {
    const sql = `UPDATE users SET name = 'John' WHERE id = 1`;
    const res = parser.parse(sql, []) as UpdateQuery;

    expect(res).toBeInstanceOf(UpdateQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.alias).toBe(null);
    expect(res.assignments).toEqual([
      {
        table: null,
        column: 'name',
        value: {
          type: 'string',
          value: 'John',
        },
      },
    ]);
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: '=',
      left: { type: 'column_ref', table: null, column: 'id' },
      right: { type: 'number', value: 1 },
    });
    expect(res.orderBy).toEqual([]);
    expect(res.limit).toEqual(0);
  });
  it('should parse CURRENT_TIMESTAMP expression', () => {
    const sql = `UPDATE users SET updated_at = CURRENT_TIMESTAMP`;
    const res = parser.parse(sql, []) as UpdateQuery;

    expect(res).toBeInstanceOf(UpdateQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('users');
    expect(res.alias).toBe(null);
    expect(res.assignments).toEqual([
      {
        table: null,
        column: 'updated_at',
        value: {
          type: 'function',
          name: 'current_timestamp',
          args: [],
          options: {},
        },
      },
    ]);
  });
  it('should parse ORDER BY and LIMIT', () => {
    const sql = `
      UPDATE users u
      SET u.name = 'updated'
      ORDER BY u.id, u.name DESC
      LIMIT 5
    `;
    const res = parser.parse(sql, []) as UpdateQuery;

    expect(res).toBeInstanceOf(UpdateQuery);
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
