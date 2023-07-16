import { Parser, SelectQuery } from '../../src/parser';

describe('select query', () => {
  const parser = new Parser();

  describe('columns', () => {
    it('should parse DISTINCT', () => {
      const sql = 'SELECT DISTINCT * FROM users';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.distinct).toBe(true);
      expect(res.columns).toEqual([{ type: 'star', table: null }]);
    });
    it('should parse function column', () => {
      const sql = 'SELECT database()';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        { type: 'function', name: 'database', args: [], options: {}, column: 'database()', alias: null },
      ]);
    });
    it('should parse aliased function column', () => {
      const sql = 'SELECT database() name';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        { type: 'function', name: 'database', args: [], options: {}, column: 'database()', alias: 'name' },
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
          args: [{ type: 'star', table: null }],
          options: {},
          column: 'COUNT(*)',
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
          args: [{ type: 'column_ref', table: 'u', column: 'id' }],
          options: {},
          column: 'COUNT(`u`.`id`)',
          alias: null,
        },
      ]);
    });
    it('should parse COUNT(DISTINCT u.id) function', () => {
      const sql = 'SELECT count(distinct u.id) FROM users u GROUP BY u.id';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'function',
          name: 'count',
          args: [{ type: 'column_ref', table: 'u', column: 'id' }],
          options: {
            distinct: true,
          },
          column: 'COUNT(DISTINCT `u`.`id`)',
          alias: null,
        },
      ]);
    });
    it('should parse GROUP_CONCAT function', () => {
      const sql = `
        SELECT
          GROUP_CONCAT(u.name separator ';') names
        FROM
          users u
        GROUP BY
          u.id
      `;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'function',
          name: 'group_concat',
          args: [{ type: 'column_ref', table: 'u', column: 'name' }],
          options: {
            separator: ';',
          },
          column: `GROUP_CONCAT(\`u\`.\`name\` SEPARATOR ';')`,
          alias: 'names',
        },
      ]);
    });
    it('should parse column names w/o aliases', () => {
      const sql = 'SELECT u.id, COUNT(u.id), SUM(u.id) FROM users u GROUP BY u.id';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'column_ref',
          table: 'u',
          column: 'id',
          alias: null,
        },
        {
          type: 'function',
          name: 'count',
          args: [{ type: 'column_ref', table: 'u', column: 'id' }],
          options: {},
          column: 'COUNT(`u`.`id`)',
          alias: null,
        },
        {
          type: 'function',
          name: 'sum',
          args: [{ type: 'column_ref', table: 'u', column: 'id' }],
          options: {},
          column: 'SUM(`u`.`id`)',
          alias: null,
        },
      ]);
    });
    it('should parse star column', () => {
      const sql = 'SELECT * FROM users';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([{ type: 'star', table: null }]);
    });
    it('should parse star column for specific table', () => {
      const sql = 'SELECT u.* FROM users u';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([{ type: 'star', table: 'u' }]);
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
      const sql = `SELECT TRUE, FALSE, 1, 'two', null`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        { type: 'boolean', value: true, column: 'TRUE', alias: null },
        { type: 'boolean', value: false, column: 'FALSE', alias: null },
        { type: 'number', value: 1, column: '1', alias: null },
        { type: 'string', value: 'two', column: 'two', alias: null },
        { type: 'null', column: 'NULL', alias: null },
      ]);
    });
    it('should parse interval', () => {
      const sql = `SELECT DATE_ADD('2023-01-02', INTERVAL 10 DAY)`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'function',
          name: 'date_add',
          args: [
            { type: 'string', value: '2023-01-02' },
            { type: 'interval', unit: 'day', value: 10 },
          ],
          options: {},
          column: `DATE_ADD('2023-01-02', INTERVAL 10 DAY)`,
          alias: null,
        },
      ]);
    });
    it('should parse CASE expression', () => {
      const sql = `
        SELECT
          CASE
            WHEN TRUE THEN 'one'
            WHEN 1 = 1 THEN 'two'
            ELSE 'other'
          END
      `;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'case',
          when: [
            {
              condition: { type: 'boolean', value: true },
              value: { type: 'string', value: 'one' },
            },
            {
              condition: {
                type: 'binary_expression',
                operator: '=',
                left: { type: 'number', value: 1 },
                right: { type: 'number', value: 1 },
              },
              value: { type: 'string', value: 'two' },
            },
          ],
          else: { type: 'string', value: 'other' },
          column: `CASE WHEN TRUE THEN 'one' WHEN 1 = 1 THEN 'two' ELSE 'other' END`,
          alias: null,
        },
      ]);
    });
  });

  describe('from', () => {
    it('should parse FROM', () => {
      const sql = 'SELECT * FROM users';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        {
          type: 'from',
          database: null,
          table: 'users',
          alias: null,
          join: null,
          on: null,
        },
      ]);
    });
    it('should parse aliased FROM', () => {
      const sql = 'SELECT u.* FROM users u';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        {
          type: 'from',
          database: null,
          table: 'users',
          alias: 'u',
          join: null,
          on: null,
        },
      ]);
    });
    it('should parse FROM with database', () => {
      const sql = 'SELECT * FROM `INFORMATION_SCHEMA`.`COLUMNS`';
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        {
          type: 'from',
          database: 'INFORMATION_SCHEMA',
          table: 'COLUMNS',
          alias: null,
          join: null,
          on: null,
        },
      ]);
    });
    it('should parse INNER JOIN', () => {
      const sql = `SELECT * FROM users u JOIN posts p ON p.user_id = u.id`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        {
          type: 'from',
          database: null,
          table: 'users',
          alias: 'u',
          join: null,
          on: null,
        },
        {
          type: 'from',
          database: null,
          table: 'posts',
          alias: 'p',
          join: 'INNER JOIN',
          on: {
            type: 'binary_expression',
            operator: '=',
            left: { type: 'column_ref', table: 'p', column: 'user_id' },
            right: { type: 'column_ref', table: 'u', column: 'id' },
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
        left: { type: 'column_ref', table: 'u', column: 'id' },
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
        left: { type: 'column_ref', table: 'u', column: 'id' },
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
        left: { type: 'column_ref', table: 'u', column: 'id' },
        right: { type: 'array', value: ['1', '2'] },
      });
    });
  });

  describe('groupBy', () => {
    it('should parse GROUP BY', () => {
      const sql = `SELECT id FROM users GROUP BY id`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.groupBy).toEqual([{ type: 'column_ref', table: null, column: 'id' }]);
    });
    it('should parse GROUP BY with aliased table', () => {
      const sql = `SELECT u.id FROM users u GROUP BY u.id`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.groupBy).toEqual([{ type: 'column_ref', table: 'u', column: 'id' }]);
    });
    it('should parse GROUP BY with position', () => {
      const sql = `SELECT name full_name FROM users u GROUP BY 1`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.groupBy).toEqual([{ type: 'number', value: 1, column: '1' }]);
    });
    it('should parse GROUP BY with expression', () => {
      const sql = `SELECT count(*) FROM users u GROUP BY concat_ws(' ', first_name, last_name)`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.groupBy).toEqual([{
        type: 'function',
        name: 'concat_ws',
        args: [
          { type: 'string', value: ' ' },
          { column: 'first_name', table: null, type: 'column_ref' },
          { column: 'last_name', table: null, type: 'column_ref' },
        ],
        column: "concat_ws(' ', `first_name`, `last_name`)",
        options: {},
      }]);
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
          left: { type: 'column_ref', table: 'u', column: 'name' },
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
      expect(res.orderBy).toEqual([{ type: 'column_ref', table: null, column: 'id', order: 'ASC' }]);
    });
    it('should parse DESC ORDER BY', () => {
      const sql = `SELECT * FROM users ORDER BY id DESC`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.orderBy).toEqual([{ type: 'column_ref', table: null, column: 'id', order: 'DESC' }]);
    });
    it('should parse ORDER BY aliased column', () => {
      const sql = `SELECT * FROM users u ORDER BY u.id ASC`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.orderBy).toEqual([{ type: 'column_ref', table: 'u', column: 'id', order: 'ASC' }]);
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
    it('should parse sub query in FROM', () => {
      const sql = `SELECT * FROM (SELECT 3 n) t`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.from).toEqual([
        {
          type: 'select',
          query: new SelectQuery(
            [],
            false,
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
    it('should parse sub query in SELECT', () => {
      const sql = `SELECT (SELECT 'two')`;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.columns).toEqual([
        {
          type: 'select',
          query: new SelectQuery(
            [],
            false,
            [
              {
                type: 'string',
                value: 'two',
                alias: null,
                column: 'two',
              },
            ],
            null,
            [],
            null,
            [],
            0,
            0,
          ),
          isArray: false,
          alias: null,
          column: `(SELECT 'two')`,
        },
      ]);
    });
    it('should parse sub query in WHERE', () => {
      const sql = `
        SELECT *
        FROM users
        WHERE id = (SELECT user_id FROM posts LIMIT 1)
      `;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.where).toEqual({
        type: 'binary_expression',
        operator: '=',
        left: {
          type: 'column_ref',
          table: null,
          column: 'id',
        },
        right: {
          type: 'select',
          query: new SelectQuery(
            [
              {
                type: 'from',
                database: null,
                table: 'posts',
                alias: null,
                join: null,
                on: null,
              },
            ],
            false,
            [
              {
                type: 'column_ref',
                table: null,
                column: 'user_id',
                alias: null,
              },
            ],
            null,
            [],
            null,
            [],
            1,
            0,
          ),
          isArray: false,
        },
      });
    });
    it('should parse sub query in WHERE using IN operator', () => {
      const sql = `
        SELECT *
        FROM users
        WHERE id IN (SELECT user_id FROM posts)
      `;
      const res = parser.parse(sql, []) as SelectQuery;

      expect(res).toBeInstanceOf(SelectQuery);
      expect(res.where).toEqual({
        type: 'binary_expression',
        operator: 'IN',
        left: {
          type: 'column_ref',
          table: null,
          column: 'id',
        },
        right: {
          type: 'select',
          query: new SelectQuery(
            [
              {
                type: 'from',
                database: null,
                table: 'posts',
                alias: null,
                join: null,
                on: null,
              },
            ],
            false,
            [
              {
                type: 'column_ref',
                table: null,
                column: 'user_id',
                alias: null,
              },
            ],
            null,
            [],
            null,
            [],
            0,
            0,
          ),
          isArray: true,
        },
      });
    });
  });
});
