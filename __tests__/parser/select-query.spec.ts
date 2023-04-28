import { Parser, SelectQuery } from '../../src/parser';

describe('select query', () => {
  const parser = new Parser();

  it('should parse function column', () => {
    const sql = 'SELECT database()';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.from).toBe(null);
    expect(res.columns).toEqual([
      { type: 'function', name: 'database', column: 'database()', args: [], alias: null },
    ]);
  });
  it('should parse aliased function column', () => {
    const sql = 'SELECT database() name';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.from).toBe(null);
    expect(res.columns).toEqual([
      { type: 'function', name: 'database', column: 'database()', args: [], alias: 'name' },
    ]);
  });
  it.skip('should parse COUNT(*) function', () => {
    const sql = 'SELECT COUNT(*) FROM users';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.columns).toEqual([
      {
        type: 'function',
        name: 'count',
        column: 'COUNT(*)',
        args: [{ type: 'star', table: null }],
        alias: null,
      },
    ]);
  });
  it.skip('should parse COUNT(u.id) function', () => {
    const sql = 'SELECT count(u.id) FROM users u GROUP BY u.id';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.columns).toEqual([
      {
        type: 'function',
        name: 'count',
        column: 'count(u.id)',
        args: [{ type: 'column_ref', table: 'users', column: 'id' }],
        alias: null,
      },
    ]);
  });
  it('should parse star column', () => {
    const sql = 'SELECT * FROM users';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.columns).toEqual([
      { type: 'star', table: null },
    ]);
  });
  it('should parse star column for specific table', () => {
    const sql = 'SELECT u.* FROM users u';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.columns).toEqual([
      { type: 'star', table: 'users' },
    ]);
  });
  it('should parse FROM', () => {
    const sql = 'SELECT * FROM users';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.from).toEqual({
      database: null,
      table: 'users',
      alias: null,
    });
  });
  it('should parse aliased FROM', () => {
    const sql = 'SELECT u.* FROM users u';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.from).toEqual({
      database: null,
      table: 'users',
      alias: 'u',
    });
  });
  it('should parse equals expression', () => {
    const sql = 'SELECT * FROM users u where u.id = 1';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: '=',
      left: { type: 'column_ref', table: 'users', column: 'id' },
      right: { type: 'number', value: 1 },
    });
  });
  it('should parse IN expression', () => {
    const sql = 'SELECT * FROM users u where u.id IN (1, 2)';
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: 'IN',
      left: { type: 'column_ref', table: 'users', column: 'id' },
      right: { type: 'array', value: [1, 2] },
    });
  });
  it('should parse string values', () => {
    const sql = `SELECT * FROM users u where u.id IN ('1', "2")`;
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.where).toEqual({
      type: 'binary_expression',
      operator: 'IN',
      left: { type: 'column_ref', table: 'users', column: 'id' },
      right: { type: 'array', value: ['1', '2'] },
    });
  });
  it('should parse GROUP BY', () => {
    const sql = `SELECT * FROM users GROUP BY id`;
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.groupBy).toEqual([
      { type: 'column_ref', table: null, column: 'id' },
    ]);
  });
  it('should parse aliased GROUP BY', () => {
    const sql = `SELECT * FROM users u GROUP BY u.id`;
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.groupBy).toEqual([
      { type: 'column_ref', table: 'users', column: 'id' },
    ]);
  });
  it('should parse default ORDER BY', () => {
    const sql = `SELECT * FROM users ORDER BY id`;
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.orderBy).toEqual([
      { type: 'column_ref', table: null, column: 'id', order: 'ASC' },
    ]);
  });
  it('should parse DESC ORDER BY', () => {
    const sql = `SELECT * FROM users ORDER BY id DESC`;
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.orderBy).toEqual([
      { type: 'column_ref', table: null, column: 'id', order: 'DESC' },
    ]);
  });
  it('should parse ORDER BY aliased column', () => {
    const sql = `SELECT * FROM users u ORDER BY u.id ASC`;
    const res = parser.parse(sql, []) as SelectQuery;

    expect(res).toBeInstanceOf(SelectQuery);
    expect(res.orderBy).toEqual([
      { type: 'column_ref', table: 'users', column: 'id', order: 'ASC' },
    ]);
  });
});
