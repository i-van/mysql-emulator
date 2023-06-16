import { query } from '../../src';

describe('select', () => {
  beforeAll(async () => {
    await query(`CREATE TABLE users (id int, name varchar(255))`);
    await query(`INSERT INTO users (id, name) VALUES (1, 'name1'), (2, 'name2'), (3, 'name3')`);

    await query(`CREATE TABLE posts (id int, text varchar(255), user_id int)`);
    await query(`INSERT INTO posts (id, text, user_id) VALUES (1, 'text', 1)`);
    await query(`INSERT INTO posts (id, text, user_id) VALUES (2, 'another text', 1)`);
    await query(`INSERT INTO posts (id, text, user_id) VALUES (3, 'another yet text', 2)`);

    await query(`CREATE TABLE profiles (id int, name varchar(255), post_count int)`);
    await query(`INSERT INTO profiles (id, name, post_count) VALUES (1, 'John', 5)`);
    await query(`INSERT INTO profiles (id, name, post_count) VALUES (2, 'John', 10)`);
    await query(`INSERT INTO profiles (id, name, post_count) VALUES (3, 'Jane', 1)`);
  });

  afterAll(async () => {
    await query(`DROP TABLE users`);
    await query(`DROP TABLE posts`);
    await query(`DROP TABLE profiles`);
  });

  describe('columns', () => {
    it('should select *', async () => {
      const res = await query(`SELECT * from users`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it('should select ids', async () => {
      const res = await query(`SELECT id from users`);

      expect(res).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });
    it('should select ids and names', async () => {
      const res = await query(`SELECT id, name from users`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it('should select "name fullName"', async () => {
      const res = await query(`SELECT name fullName from users`);

      expect(res).toEqual([{ fullName: 'name1' }, { fullName: 'name2' }, { fullName: 'name3' }]);
    });
    it('should select database', async () => {
      const res = await query(`SELECT database()`);

      expect(res).toEqual([{ 'database()': expect.any(String) }]);
    });
    it('should select alias to database', async () => {
      const res = await query(`SELECT database() as name`);

      expect(res).toEqual([{ name: expect.any(String) }]);
    });
    it('should select version', async () => {
      const res = await query(`SELECT version()`);

      expect(res).toEqual([{ 'version()': expect.any(String) }]);
    });
    it('should select alias to version', async () => {
      const res = await query(`SELECT version() as v`);

      expect(res).toEqual([{ v: expect.any(String) }]);
    });
    it('should select primitives', async () => {
      const res = await query(`SELECT true, false, 10, 'two', null`);

      expect(res).toEqual([{ true: 1, false: 0, '10': 10, two: 'two', NULL: null }]);
    });
    it('should select expressions', async () => {
      const res = await query(`
        SELECT
          1 != 2         v1,
          1 <> 1         v2,
          1 > 2          v3,
          2 >= 1         v4,
          2 < 1          v5,
          1 <= 2         v6,
          1 + 1          v7,
          2 - 1          v8,
          2 * 1          v9,
          2 / 2          v10,
          1 AND 0        v11,
          1 OR 0         v12,
          null is null   v13,
          1 is not null  v14,
          'one' + 'two'  v15,
          1.5 * 'two'    v16,
          'one' - 1      v17,
          'one' / 1.5    v18,
          'one' / 'two'  v19,
          1.5 / 'one'    v20,
          5 / 0          v21,
          0 / 5          v22,
          5 % 3          v23,
          5 % 0          v24,
          5 % 'one'      v25,
          'five' % 1     v26
      `);

      expect(res).toEqual([
        {
          v1: 1,
          v2: 0,
          v3: 0,
          v4: 1,
          v5: 0,
          v6: 1,
          v7: 2,
          v8: 1,
          v9: 2,
          v10: '1.0000',
          v11: 0,
          v12: 1,
          v13: 1,
          v14: 1,
          v15: 0,
          v16: 0,
          v17: -1,
          v18: 0,
          v19: null,
          v20: null,
          v21: null,
          v22: '0.0000',
          v23: 2,
          v24: null,
          v25: null,
          v26: 0,
        },
      ]);
    });
    it('should select function expressions', async () => {
      const res = await query(`
        SELECT
          concat('one', 'two', 'three')                         v1,
          concat_ws('-', 'one', 'two', 'three')                 v2,
          substring('mysql emulator', 1, 5)                     v3,
          substring('mysql emulator', 7)                        v4,
          substr('mysql emulator', 1, 5)                        v5,
          substr('mysql emulator', 7)                           v6,
          substring_index('mysql-emulator-playground', '-', 2)  v7,
          field('c', 'a', 'b', 'c', 'd')                        v8,
          character_length('mysql-emulator')                    v9,
          char_length('mysql-emulator')                         v10,
          length('mysql-emulator')                              v11,
          lower('MYSQL-EMULATOR')                               v12,
          upper('mysql-emulator')                               v13,
          mod(5, 3)                                             v14,
          greatest(4, 3, 2, 1)                                  v15,
          greatest(4, '33', 2, 1)                               v16,
          greatest(4, '33', 2, 1, null)                         v17,
          ceil(25.25)                                           v18,
          ceiling(25.25)                                        v19,
          floor(25.75)                                          v20,
          round(25.57, 1)                                       v21,
          round(25.52, 1)                                       v22,
          round(25.25)                                          v23,
          round(25.75)                                          v24
      `);

      expect(res).toEqual([
        {
          v1: 'onetwothree',
          v2: 'one-two-three',
          v3: 'mysql',
          v4: 'emulator',
          v5: 'mysql',
          v6: 'emulator',
          v7: 'mysql-emulator',
          v8: 3,
          v9: 14,
          v10: 14,
          v11: 14,
          v12: 'mysql-emulator',
          v13: 'MYSQL-EMULATOR',
          v14: 2,
          v15: 4,
          v16: '4',
          v17: null,
          v18: 26,
          v19: 26,
          v20: 25,
          v21: '25.6',
          v22: '25.5',
          v23: '25',
          v24: '26',
        },
      ]);
    });
    it('should throw an error if column is unknown', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT user_id from users`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown column 'user_id' in 'field list'`);
      }
    });
    it('should run aggregate functions', async () => {
      const res = await query(`
        SELECT
          COUNT(p.name) count,
          SUM(p.post_count) sum,
          MAX(p.post_count) max,
          MIN(p.post_count) min,
          AVG(p.post_count) avg
        FROM
          profiles p
      `);

      expect(res).toEqual([{ count: 3, sum: '16', min: 1, max: 10, avg: '5.3333' }]);
    });
    it('should return null if nothing to sum', async () => {
      const res = await query(`
        SELECT
          SUM(p.post_count) sum
        FROM
          profiles p
        WHERE
          p.id > 10
      `);

      expect(res).toEqual([{ sum: null }]);
    });
  });

  describe('from clause', () => {
    it('should select from aliased table', async () => {
      const res = await query(`SELECT * from users t`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it('should select t.* from aliased table', async () => {
      const res = await query(`SELECT t.* from users t`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it('should select t.name from aliased table', async () => {
      const res = await query(`SELECT t.name from users t`);

      expect(res).toEqual([{ name: 'name1' }, { name: 'name2' }, { name: 'name3' }]);
    });
    it('should select "t.name fullName" from aliased table', async () => {
      const res = await query(`SELECT t.name fullName from users t`);

      expect(res).toEqual([{ fullName: 'name1' }, { fullName: 'name2' }, { fullName: 'name3' }]);
    });
  });

  describe('where clause', () => {
    it('should filter by "u.id = 1"', async () => {
      const res = await query(`SELECT * from users u where u.id = 1`);

      expect(res).toEqual([{ id: 1, name: 'name1' }]);
    });
    it(`should filter by "u.id = '1'"`, async () => {
      const res = await query(`SELECT * from users u where u.id = '1'`);

      expect(res).toEqual([{ id: 1, name: 'name1' }]);
    });
    it(`should filter by "NOT u.id = 1"`, async () => {
      const res = await query(`SELECT * from users u where NOT u.id = 1`);

      expect(res).toEqual([
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it(`should filter by "u.id BETWEEN 1 AND 2"`, async () => {
      const res = await query(`SELECT * from users u where u.id BETWEEN 1 AND 2`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
      ]);
    });
    it(`should filter by "u.name LIKE '%me_"`, async () => {
      const res = await query(`SELECT * from users u where u.name LIKE '%me_'`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it('should filter by "u.id in (1, 2)"', async () => {
      const res = await query(`SELECT * from users u where u.id in (1, 2)`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
      ]);
    });
    it(`should filter by "u.id in ('1', '2')"`, async () => {
      const res = await query(`SELECT * from users u where u.id in ('1', '2')`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
      ]);
    });
    it(`should filter by "u.id not in (3, 4)"`, async () => {
      const res = await query(`SELECT * from users u where u.id not in (3, 4)`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
      ]);
    });
    it('should filter by "u.id = 2 or u.id = 3"', async () => {
      const res = await query(`SELECT * from users u where u.id = 2 or u.id = 3`);

      expect(res).toEqual([
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it(`should filter by "u.id = 2 and u.name = 'name2'`, async () => {
      const res = await query(`SELECT * from users u where u.id = 2 and u.name = 'name2'`);

      expect(res).toEqual([{ id: 2, name: 'name2' }]);
    });
    it('should throw an error if column is unknown', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT * from users u WHERE u.user_id = 1`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown column 'u.user_id' in 'where clause'`);
      }
    });
  });

  describe('having clause', () => {
    it('should filter w/o group by clause', async () => {
      const res = await query(`
        SELECT id, name full_name
        FROM users
        HAVING full_name = 'name1'
      `);

      expect(res).toEqual([{ id: 1, full_name: 'name1' }]);
    });
    it('should filter by "count > 1"', async () => {
      const res = await query(`
        SELECT p.user_id, COUNT(p.user_id) count
        FROM posts p
        GROUP BY p.user_id
        HAVING count > 1
      `);

      expect(res).toEqual([{ user_id: 1, count: 2 }]);
    });
    it('should filter by "p.user_id = 1"', async () => {
      const res = await query(`
        SELECT p.user_id, COUNT(p.user_id) count
        FROM posts p
        GROUP BY p.user_id
        HAVING p.user_id = 1
      `);

      expect(res).toEqual([{ user_id: 1, count: 2 }]);
    });
    it('should filter by "user_id = 1"', async () => {
      const res = await query(`
        SELECT p.user_id, COUNT(p.user_id) count
        FROM posts p
        GROUP BY p.user_id
        HAVING user_id = 1
      `);

      expect(res).toEqual([{ user_id: 1, count: 2 }]);
    });
    it('should throw an error if column is unknown', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT * from users u HAVING u.user_id = 1`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown column 'u.user_id' in 'having clause'`);
      }
    });
  });

  describe('order by clause', () => {
    it('should ORDER BY p.id', async () => {
      const res = await query(`SELECT * from profiles p ORDER BY p.id`);

      expect(res).toEqual([
        { id: 1, name: 'John', post_count: 5 },
        { id: 2, name: 'John', post_count: 10 },
        { id: 3, name: 'Jane', post_count: 1 },
      ]);
    });
    it('should ORDER BY p.post_count DESC', async () => {
      const res = await query(`SELECT * from profiles p ORDER BY p.post_count DESC`);

      expect(res).toEqual([
        { id: 2, name: 'John', post_count: 10 },
        { id: 1, name: 'John', post_count: 5 },
        { id: 3, name: 'Jane', post_count: 1 },
      ]);
    });
    it('should ORDER BY p.name DESC, p.post_count DESC', async () => {
      const res = await query(`SELECT * from profiles p ORDER BY p.name DESC, p.post_count DESC`);

      expect(res).toEqual([
        { id: 2, name: 'John', post_count: 10 },
        { id: 1, name: 'John', post_count: 5 },
        { id: 3, name: 'Jane', post_count: 1 },
      ]);
    });
    it('should throw an error if column is unknown', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT * from users u ORDER BY u.user_id`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown column 'u.user_id' in 'order clause'`);
      }
    });
  });

  describe('group by clause', () => {
    it('should COUNT values GROUPED BY p.name', async () => {
      const res = await query(`SELECT p.name, COUNT(*) count from profiles p GROUP BY p.name`);

      expect(res).toEqual([
        { name: 'John', count: 2 },
        { name: 'Jane', count: 1 },
      ]);
    });
    it('should SUM values GROUPED BY p.name', async () => {
      const res = await query(`SELECT p.name, SUM(p.post_count) count from profiles p GROUP BY p.name`);

      expect(res).toEqual([
        { name: 'John', count: '15' },
        { name: 'Jane', count: '1' },
      ]);
    });
    it('should throw an error if column is unknown', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT * from users u GROUP BY u.user_id`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown column 'u.user_id' in 'group statement'`);
      }
    });
  });

  describe('join', () => {
    it('should JOIN posts', async () => {
      const res = await query(`SELECT u.name, p.text FROM users u JOIN posts p ON p.user_id = u.id`);

      expect(res).toEqual([
        { name: 'name1', text: 'text' },
        { name: 'name1', text: 'another text' },
        { name: 'name2', text: 'another yet text' },
      ]);
    });
    it('should LEFT JOIN posts', async () => {
      const res = await query(`
        SELECT u.name, p.text
        FROM users u
        LEFT JOIN posts p ON p.user_id = u.id
        ORDER BY u.id, p.id
      `);

      expect(res).toEqual([
        { name: 'name1', text: 'text' },
        { name: 'name1', text: 'another text' },
        { name: 'name2', text: 'another yet text' },
        { name: 'name3', text: null },
      ]);
    });
    it('should CROSS JOIN posts', async () => {
      const res = await query(`
        SELECT u.name, p.text
        FROM users u
        CROSS JOIN posts p
        ORDER BY u.id, p.id
      `);

      expect(res).toEqual([
        { name: 'name1', text: 'text' },
        { name: 'name1', text: 'another text' },
        { name: 'name1', text: 'another yet text' },
        { name: 'name2', text: 'text' },
        { name: 'name2', text: 'another text' },
        { name: 'name2', text: 'another yet text' },
        { name: 'name3', text: 'text' },
        { name: 'name3', text: 'another text' },
        { name: 'name3', text: 'another yet text' },
      ]);
    });
    it('should COUNT(u.name) over LEFT JOINED posts', async () => {
      const res = await query(`
        SELECT u.name, COUNT(p.id) count
        FROM users u
        LEFT JOIN posts p ON p.user_id = u.id
        GROUP BY u.name
      `);

      expect(res).toEqual([
        { name: 'name1', count: 2 },
        { name: 'name2', count: 1 },
        { name: 'name3', count: 0 },
      ]);
    });
    it('should throw an error if column is unknown', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT u.name, p.text FROM users u JOIN posts p ON p.user_id = u.user_id`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown column 'u.user_id' in 'on clause'`);
      }
    });
    it('should run aggregate functions', async () => {
      const res = await query(`
        SELECT
          p.name,
          COUNT(p.name) count,
          SUM(p.post_count) sum,
          MAX(p.post_count) max,
          MIN(p.post_count) min,
          AVG(p.post_count) avg
        FROM
          profiles p
        GROUP BY
          p.name
      `);

      expect(res).toEqual([
        { name: 'John', count: 2, sum: '15', min: 5, max: 10, avg: '7.5000' },
        { name: 'Jane', count: 1, sum: '1', min: 1, max: 1, avg: '1.0000' },
      ]);
    });
  });

  describe('limit', () => {
    it('should LIMIT users', async () => {
      const res = await query(`SELECT * FROM users LIMIT 1`);

      expect(res).toEqual([{ id: 1, name: 'name1' }]);
    });
    it('should LIMIT and OFFSET users', async () => {
      const res = await query(`SELECT * FROM users LIMIT 1, 2`);

      expect(res).toEqual([
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
  });

  describe('sub query', () => {
    it('should throw an error if sub query has no alias', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT * FROM (SELECT 3 n)`);
      } catch (err: any) {
        expect(err.message).toBe('Every derived table must have its own alias');
      }
    });
    it('should select everything from sub query with primitive', async () => {
      const res = await query(`SELECT * FROM (SELECT 3 n) t`);

      expect(res).toEqual([{ n: 3 }]);
    });
    it('should select one field from sub query', async () => {
      const res = await query(`SELECT t.name FROM (SELECT name FROM users) t`);

      expect(res).toEqual([{ name: 'name1' }, { name: 'name2' }, { name: 'name3' }]);
    });
    it('should throw an error if sub query returns several columns', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT (SELECT * FROM users LIMIT 1) t`);
      } catch (err: any) {
        expect(err.message).toBe('Operand should contain 1 column(s)');
      }
    });
    it('should throw an error if sub query returns more than 1 row', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT (SELECT name FROM users) t`);
      } catch (err: any) {
        expect(err.message).toBe('Subquery returns more than 1 row');
      }
    });
    it('should select from sub query in SELECT', async () => {
      const res = await query(`SELECT (SELECT name FROM users LIMIT 1) t`);

      expect(res).toEqual([{ t: 'name1' }]);
    });
    it('should select from sub query with where clause in SELECT', async () => {
      const res = await query(`
        SELECT
          (SELECT u.name FROM users u WHERE u.id = p.user_id) name,
          p.text
        FROM
          posts p
      `);

      expect(res).toEqual([
        { name: 'name1', text: 'text' },
        { name: 'name1', text: 'another text' },
        { name: 'name2', text: 'another yet text' },
      ]);
    });
    it('should filter by sub query in WHERE', async () => {
      const res = await query(`
        SELECT
          *
        FROM
          users u
        WHERE
          u.id = (SELECT user_id FROM posts LIMIT 1)
      `);

      expect(res).toEqual([{ id: 1, name: 'name1' }]);
    });
    it('should filter by sub query in WHERE using IN operator', async () => {
      const res = await query(`
        SELECT
          u.name
        FROM
          users u
        WHERE
          u.id IN (SELECT p.user_id FROM posts p)
      `);

      expect(res).toEqual([{ name: 'name1' }, { name: 'name2' }]);
    });
    it('should filter by sub query with where clause in WHERE', async () => {
      const res = await query(`
        SELECT
          p1.name,
          p1.post_count
        FROM
          profiles p1
        WHERE
          p1.post_count = (SELECT MAX(p2.post_count) FROM profiles p2 WHERE p1.name = p2.name)
      `);

      expect(res).toEqual([
        { name: 'John', post_count: 10 },
        { name: 'Jane', post_count: 1 },
      ]);
    });
  });
});
