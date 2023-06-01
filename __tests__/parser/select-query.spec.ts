import { Parser, SelectQuery } from '../../src/parser';
import { query } from '../../src';

describe('select query', () => {
  const parser = new Parser();

  describe('columns', () => {
    it('should parse function column', () => {
      const sql = 'SELECT database()';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        { type: 'function', name: 'database', column: 'database()', args: [], alias: null },
      ]);
    });
    it('should parse aliased function column', () => {
      const sql = 'SELECT database() name';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        { type: 'function', name: 'database', column: 'database()', args: [], alias: 'name' },
      ]);
    });
    it('should parse COUNT(*) function', () => {
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
    it('should parse COUNT(u.id) function', () => {
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
    it('should parse expression', () => {
      const sql = 'SELECT 1 + 1 result';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'binary_expression',
          operator: '+',
          left: { type: 'number', value: 1 },
          right: { type: 'number', value: 1 },
          column: '1 + 1',
          alias: 'result',
        },
      ]);
    });
    it('should parse primitives', () => {
      const sql = `SELECT true, false, 1, 'two', null`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        { type: 'boolean', value: true, column: 'true', alias: null },
        { type: 'boolean', value: false, column: 'false', alias: null },
        { type: 'number', value: 1, column: '1', alias: null },
        { type: 'string', value: 'two', column: 'two', alias: null },
        { type: 'null', column: 'NULL', alias: null },
      ]);
    });
  });

  describe('from', () => {
    it('should parse FROM', () => {
      const sql = 'SELECT * FROM users';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        { database: null, table: 'users', join: null, on: null },
      ]);
    });
    it('should parse aliased FROM', () => {
      const sql = 'SELECT u.* FROM users u';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        { database: null, table: 'users', join: null, on: null },
      ]);
    });
    it('should parse FROM with database', () => {
      const sql = 'SELECT * FROM `INFORMATION_SCHEMA`.`COLUMNS`';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        { database: 'INFORMATION_SCHEMA', table: 'COLUMNS', join: null, on: null },
      ]);
    });
    it('should parse INNER JOIN', () => {
      const sql = `SELECT * FROM users u JOIN posts p ON p.user_id = u.id`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        { database: null, table: 'users', join: null, on: null },
        {
          database: null,
          table: 'posts',
          join: 'INNER JOIN',
          on: {
            type: 'binary_expression',
            operator: '=',
            left: { type: 'column_ref', table: 'posts', column: 'user_id' },
            right: { type: 'column_ref', table: 'users', column: 'id' },
          },
        },
      ]);
    });
  });

  describe('where', () => {
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
  });

  describe('groupBy', () => {
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
  });

  describe('having', () => {
    it('should parse HAVING', () => {
      const sql = `
        SELECT u.name, COUNT(u.name) count
        FROM users u
        GROUP BY u.name
        HAVING u.name = 'Jane' AND count > 0
      `;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.having).toEqual({
        type: 'binary_expression',
        operator: 'AND',
        left: {
          type: 'binary_expression',
          operator: '=',
          left: { type: 'column_ref', table: 'users', column: 'name' },
          right: { type: 'string', value: 'Jane' },
        },
        right: {
          type: 'binary_expression',
          operator: '>',
          left: { type: 'column_ref', table: null, column: 'count' },
          right: { type: 'number', value: 0 },
        },
      });
    });
  });

  describe('orderBy', () => {
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

  describe('limit', () => {
    it('should parse LIMIT', () => {
      const sql = `SELECT * FROM users LIMIT 1`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.limit).toEqual(1);
      expect(res.offset).toEqual(0);
    });
    it('should parse LIMIT/OFFSET', () => {
      const sql = `SELECT * FROM users LIMIT 1 OFFSET 5`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.limit).toEqual(1);
      expect(res.offset).toEqual(5);
    });
    it('should parse short syntax LIMIT', () => {
      const sql = `SELECT * FROM users LIMIT 5, 1`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.limit).toEqual(1);
      expect(res.offset).toEqual(5);
    });
  });

  describe('sub query', () => {
    it('should parse sub query', () => {
      const sql = `SELECT * FROM (SELECT 3 n) t`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        {
          query: new SelectQuery(
            [],
            [
              {
                type: 'number',
                value: 3,
                alias: 'n',
                column: '3',
              },
            ],
            null,
            [],
            null,
            [],
            0,
            0,
          ),
          alias: 't',
          join: null,
          on: null,
        },
      ]);
    });
  });
});
