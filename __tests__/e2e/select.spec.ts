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

    await query('CREATE TABLE relations (`from` int, `to` int)');
    await query(`INSERT INTO relations VALUES (1, 2)`);
    await query(`INSERT INTO relations VALUES (1, 2)`);
    await query(`INSERT INTO relations VALUES (2, 1)`);
    await query(`INSERT INTO relations VALUES (3, 1)`);
  });

  afterAll(async () => {
    await query(`DROP TABLE users`);
    await query(`DROP TABLE posts`);
    await query(`DROP TABLE profiles`);
    await query(`DROP TABLE relations`);
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
    it('should select distinct *', async () => {
      const res = await query(`SELECT DISTINCT * FROM relations`);

      expect(res).toEqual([
        { from: 1, to: 2 },
        { from: 2, to: 1 },
        { from: 3, to: 1 },
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
    it('should throw an error in aggregated query without GROUP BY', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT name, COUNT(name) count FROM profiles`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^In aggregated query without GROUP BY, expression #1 of SELECT list contains nonaggregated column '(.*)profiles\.name'/,
        );
      }
    });
    it('should throw an error in aggregated query selecting * without GROUP BY', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT *, COUNT(name) count FROM profiles p`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^In aggregated query without GROUP BY, expression #1 of SELECT list contains nonaggregated column '(.*)p\.id'/,
        );
      }
    });
    it('should COUNT DISTINCT user_id', async () => {
      const res = await query(`
        SELECT
          COUNT(DISTINCT user_id) count
        FROM
          posts
      `);

      expect(res).toEqual([{ count: 2 }]);
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
    it('should run EXISTS function', async () => {
      const res = await query(`
        SELECT
          EXISTS(SELECT * FROM users) v
      `);

      expect(res).toEqual([{ v: 1 }]);
    });
    it('should run EXISTS function at WHERE clause', async () => {
      const res = await query(`
        SELECT
          u.*
        FROM
          users u
        WHERE
          EXISTS(SELECT p.id FROM posts p WHERE p.user_id = u.id)
      `);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
        { id: 2, name: 'name2' },
      ]);
    });
  });

  describe('expressions', () => {
    const cases: [string, object[]][] = [
      ['SELECT database()', [{ 'database()': expect.any(String) }]],
      ['SELECT database() as name', [{ name: expect.any(String) }]],
      ['SELECT version() v', [{ v: expect.any(String) }]],

      ['SELECT TRUE', [{ TRUE: 1 }]],
      ['SELECT FALSE', [{ FALSE: 0 }]],
      ['SELECT 10', [{ '10': 10 }]],
      [`SELECT 'two'`, [{ two: 'two' }]],
      ['SELECT null', [{ NULL: null }]],

      ['SELECT 1 != 2 v', [{ v: 1 }]],
      ['SELECT 1 <> 1 v', [{ v: 0 }]],
      ['SELECT 1 > 2 v', [{ v: 0 }]],
      ['SELECT 2 >= 1 v', [{ v: 1 }]],
      ['SELECT 2 < 1 v', [{ v: 0 }]],
      ['SELECT 1 <= 2 v', [{ v: 1 }]],
      ['SELECT 1 + 1 v', [{ v: 2 }]],
      ['SELECT 2 - 1 v', [{ v: 1 }]],
      ['SELECT 2 * 1 v', [{ v: 2 }]],
      ['SELECT 2 / 2 v', [{ v: '1.0000' }]],
      ['SELECT 1 AND 0 v', [{ v: 0 }]],
      ['SELECT 1 OR 0 v', [{ v: 1 }]],
      ['SELECT null is null v', [{ v: 1 }]],
      ['SELECT 1 is not null v', [{ v: 1 }]],
      [`SELECT 'one' + 'two' v`, [{ v: 0 }]],
      [`SELECT 1.5 * 'two' v`, [{ v: 0 }]],
      [`SELECT 'one' - 1 v`, [{ v: -1 }]],
      [`SELECT 'one' / 1.5 v`, [{ v: 0 }]],
      [`SELECT 'one' / 'two' v`, [{ v: null }]],
      [`SELECT 1.5 / 'one' v`, [{ v: null }]],
      ['SELECT 5 / 0 v', [{ v: null }]],
      ['SELECT 0 / 5 v', [{ v: '0.0000' }]],
      ['SELECT 5 % 3 v', [{ v: 2 }]],
      ['SELECT 5 % 0 v', [{ v: null }]],
      [`SELECT 5 % 'one' v`, [{ v: null }]],
      [`SELECT 'five' % 1 v`, [{ v: 0 }]],
      // node-sql-parser does not parse aliases for unary expressions
      [`SELECT (- 5) v`, [{ v: -5 }]],
      [`SELECT (-'5') v`, [{ v: -5 }]],
      [`SELECT (-'five') v`, [{ v: -0 }]],
      [`SELECT (-'0') v`, [{ v: -0 }]],
      [`SELECT (- 0) v`, [{ v: 0 }]],
      [`SELECT (-null) v`, [{ v: null }]],
      [`SELECT (-true) v`, [{ v: -1 }]],

      [`SELECT concat('one', 'two', 'three') v`, [{ v: 'onetwothree' }]],
      [`SELECT concat_ws('-', 'one', 'two', 'three') v`, [{ v: 'one-two-three' }]],
      [`SELECT substring('mysql emulator', 1, 5) v`, [{ v: 'mysql' }]],
      [`SELECT substring('mysql emulator', 7) v`, [{ v: 'emulator' }]],
      [`SELECT substr('mysql emulator', 1, 5) v`, [{ v: 'mysql' }]],
      [`SELECT substr('mysql emulator', 7) v`, [{ v: 'emulator' }]],
      [`SELECT substring_index('mysql-emulator-playground', '-', 2) v`, [{ v: 'mysql-emulator' }]],
      [`SELECT field('c', 'a', 'b', 'c', 'd') v`, [{ v: 3 }]],
      [`SELECT character_length('mysql-emulator') v`, [{ v: 14 }]],
      [`SELECT char_length('mysql-emulator') v`, [{ v: 14 }]],
      [`SELECT length('mysql-emulator') v`, [{ v: 14 }]],
      [`SELECT lower('MYSQL-EMULATOR') v`, [{ v: 'mysql-emulator' }]],
      [`SELECT upper('mysql-emulator') v`, [{ v: 'MYSQL-EMULATOR' }]],

      ['SELECT mod(5, 3) v', [{ v: 2 }]],
      ['SELECT greatest(4, 3, 2, 1) v', [{ v: 4 }]],
      [`SELECT greatest(4, '33', 2, 1) v`, [{ v: '4' }]],
      [`SELECT greatest(4, '33', 2, 1, null) v`, [{ v: null }]],
      ['SELECT ceil(25.25) v', [{ v: 26 }]],
      ['SELECT ceiling(25.25) v', [{ v: 26 }]],
      ['SELECT floor(25.75) v', [{ v: 25 }]],
      ['SELECT round(25.57, 1) v', [{ v: '25.6' }]],
      ['SELECT round(25.52, 1) v', [{ v: '25.5' }]],
      ['SELECT round(25.25) v', [{ v: '25' }]],
      ['SELECT round(25.75) v', [{ v: '26' }]],

      ['SELECT isnull(null) v', [{ v: 1 }]],
      [`SELECT isnull('') v`, [{ v: 0 }]],
      ['SELECT isnull(123) v', [{ v: 0 }]],
      [`SELECT ifnull(null, 'one') v`, [{ v: 'one' }]],
      [`SELECT ifnull('', 'two') v`, [{ v: '' }]],
      ['SELECT ifnull(123, 3) v', [{ v: 123 }]],
      [`SELECT ifnull(123, 'three') v`, [{ v: '123' }]],
      [`SELECT nullif('one', 'one') v`, [{ v: null }]],
      [`SELECT nullif('1', 1) v`, [{ v: null }]],
      [`SELECT nullif(1, '1') v`, [{ v: null }]],
      [`SELECT nullif(1, '2') v`, [{ v: 1 }]],
      [`SELECT nullif('1', 2) v`, [{ v: '1' }]],
      [`SELECT if(null, 'yes', 'no') v`, [{ v: 'no' }]],
      [`SELECT if(5, 'yes', 'no') v`, [{ v: 'yes' }]],
      [`SELECT if(-5, 'yes', 'no') v`, [{ v: 'yes' }]],
      [`SELECT if('', 'yes', 'no') v`, [{ v: 'no' }]],
      [`SELECT if(true, 1, 'two') v`, [{ v: '1' }]],
      [`SELECT if(false, 1, 2) v`, [{ v: 2 }]],
      [`SELECT coalesce(null, null, '', 'mysql', null) v`, [{ v: '' }]],
      ['SELECT coalesce(null) v', [{ v: null }]],
      [`SELECT CASE WHEN true THEN 'one' END v`, [{ v: 'one' }]],
      [`SELECT CASE WHEN false THEN 'one' WHEN true THEN 'two' END v`, [{ v: 'two' }]],
      [`SELECT CASE WHEN false THEN 'one' ELSE 'two' END v`, [{ v: 'two' }]],
      [`SELECT CASE WHEN false THEN 'one' END v`, [{ v: null }]],
    ];

    test.each(cases)('should run %s', async (sql, expected) => {
      expect(await query(sql)).toEqual(expected);
    });

    test.each([
      [`LAST_DAY('2023-02-01')`, new Date('2023-02-28 00:00:00')],
      [`DAY('2017-06-15')`, 15],
      [`DAY('2017-06-15 00:00:00')`, 15],
      [`DAYOFMONTH('2017-06-15')`, 15],
      [`WEEKDAY('2023-01-01')`, 6],
      [`DATEDIFF('2023-01-30', '2023-01-31')`, -1],
      [`DATEDIFF('2023-01-31 00:00:00', '2023-01-30 23:59:59')`, 1],
      [`DATE('2023-01-02 03:04:05')`, new Date('2023-01-02 00:00:00')],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%Y %y')`, '2023 23'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%M %b %c %m')`, 'January Jan 1 01'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%D %d %e')`, '2nd 02 2'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%H %h %I %k %l %p')`, '03 03 03 3 3 AM'],
      [`DATE_FORMAT('2023-01-02 13:04:05', '%H %h %I %k %l %p')`, '13 01 01 13 1 PM'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%i')`, '04'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%S %s')`, '05 05'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%f')`, '000000'],
      [`DATE_FORMAT('2023-01-02 03:04:05', '%r %T')`, '03:04:05 AM 03:04:05'],
      [`DATE_FORMAT('2023-01-02 13:04:05', '%r %T')`, '01:04:05 PM 13:04:05'],
      [`DATE_FORMAT('2023-01-02 13:04:05', '%w %W %a %j')`, '1 Monday Mon 002'],
      [`DATE_FORMAT('2023-01-02', '%r %T')`, '12:00:00 AM 00:00:00'],
      [`DATE_FORMAT('2023-01-02', '%H %h %I %k %l %p')`, '00 12 12 0 12 AM'],
      [`DATE_FORMAT(null, '%T')`, null],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 SECOND)`, '2023-01-02 00:00:01'],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 MINUTE)`, '2023-01-02 00:01:00'],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 HOUR)`, '2023-01-02 01:00:00'],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 DAY)`, '2023-01-03 00:00:00'],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 WEEK)`, '2023-01-09 00:00:00'],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 MONTH)`, '2023-02-02 00:00:00'],
      [`DATE_ADD('2023-01-02 00:00:00', INTERVAL 1 YEAR)`, '2024-01-02 00:00:00'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 SECOND)`, '2023-01-01 23:59:59'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 MINUTE)`, '2023-01-01 23:59:00'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 HOUR)`, '2023-01-01 23:00:00'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 DAY)`, '2023-01-01 00:00:00'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 WEEK)`, '2022-12-26 00:00:00'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 MONTH)`, '2022-12-02 00:00:00'],
      [`DATE_SUB('2023-01-02 00:00:00', INTERVAL 1 YEAR)`, '2022-01-02 00:00:00'],
      [`UNIX_TIMESTAMP('2023-01-02 00:00:00')`, 1672617600],
      [`UNIX_TIMESTAMP()`, expect.any(Number)],
      [`FROM_UNIXTIME(1672617600)`, new Date('2023-01-02 00:00:00')],
      [`FROM_UNIXTIME(UNIX_TIMESTAMP('2023-01-02 00:00:00'))`, new Date('2023-01-02 00:00:00')],
    ])('should run date function %s', async (expression, expected) => {
      expect(await query(`SELECT ${expression} v`)).toEqual([{ v: expected }]);
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
    it('should filter by "COUNT(p.user_id)"', async () => {
      const res = await query(`
        SELECT p.user_id
        FROM posts p
        GROUP BY p.user_id
        HAVING COUNT(*) > 1
      `);

      expect(res).toEqual([{ user_id: 1 }]);
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
    it('should run GROUP_CONCAT', async () => {
      const res = await query(`
        SELECT
          p.user_id,
          GROUP_CONCAT(p.id) ids,
          GROUP_CONCAT(p.text separator ';') text
        FROM
          posts p
        GROUP BY
          p.user_id
      `);

      expect(res).toEqual([
        { user_id: 1, ids: '1,2', text: 'text;another text' },
        { user_id: 2, ids: '3', text: 'another yet text' },
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
