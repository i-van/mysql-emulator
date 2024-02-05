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
    it('should throw an error selecting unknown table', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT t.* FROM profiles p`);
      } catch (err: any) {
        expect(err.message).toBe(`Unknown table 't'`);
      }
    });
    it('should throw an error selecting column ref in aggregated query without GROUP BY', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT name, COUNT(name) count FROM profiles`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^In aggregated query without GROUP BY, expression #1 of SELECT list contains nonaggregated column '(.*)profiles\.name'/,
        );
      }
    });
    it('should throw an error selecting nested column ref in aggregated query without GROUP BY', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT COUNT(name), CONCAT('Hello ', name) count FROM profiles`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^In aggregated query without GROUP BY, expression #2 of SELECT list contains nonaggregated column '(.*)profiles\.name'/,
        );
      }
    });
    it('should throw an error selecting * in aggregated query without GROUP BY', async () => {
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
    test.each([
      ['SELECT database()', [{ 'database()': expect.any(String) }]],
      ['SELECT database() as name', [{ name: expect.any(String) }]],
      ['SELECT version() v', [{ v: expect.any(String) }]],

      ['SELECT TRUE', [{ TRUE: 1 }]],
      ['SELECT FALSE', [{ FALSE: 0 }]],
      ['SELECT 10', [{ '10': 10 }]],
      [`SELECT 'two'`, [{ two: 'two' }]],
      ['SELECT null', [{ NULL: null }]],
    ])('should run %s', async (sql, expected) => {
      expect(await query(sql)).toEqual(expected);
    });

    test.each([
      ['1 != 2', 1],
      ['1 <> 1', 0],
      ['1 > 2', 0],
      ['2 >= 1', 1],
      ['2 < 1', 0],
      ['1 <= 2', 1],
      ['1 + 1', 2],
      ['2 - 1', 1],
      ['2 * 1', 2],
      ['2 / 2', '1.0000'],
      ['1 AND 0', 0],
      ['1 OR 0', 1],
      ['null is null', 1],
      ['1 is not null', 1],
      [`'one' + 'two'`, 0],
      [`1.5 * 'two'`, 0],
      [`'one' - 1`, -1],
      [`'one' / 1.5`, 0],
      [`'one' / 'two'`, null],
      [`1.5 / 'one'`, null],
      ['5 / 0', null],
      ['0 / 5', '0.0000'],
      ['5 % 3', 2],
      ['5 % 0', null],
      [`5 % 'one'`, null],
      [`'five' % 1`, 0],
      // node-sql-parser does not parse aliases for unary expressions
      [`(- 5)`, -5],
      [`(-'5')`, -5],
      [`(-'five')`, -0],
      [`(-'0')`, -0],
      [`(- 0)`, 0],
      [`(-null)`, null],
      [`(-true)`, -1],
    ])('should run expression %s', async (expression, expected) => {
      expect(await query(`SELECT ${expression} v`)).toEqual([{ v: expected }]);
    });

    test.each([
      [`concat('one', 'two', 'three')`, 'onetwothree'],
      [`concat_ws('-', 'one', 'two', 'three')`, 'one-two-three'],
      [`substring('mysql emulator', 1, 5)`, 'mysql'],
      [`substring('mysql emulator', 7)`, 'emulator'],
      [`substr('mysql emulator', 1, 5)`, 'mysql'],
      [`substr('mysql emulator', 7)`, 'emulator'],
      [`substring_index('mysql-emulator-playground', '-', 2)`, 'mysql-emulator'],
      [`field('c', 'a', 'b', 'c', 'd')`, 3],
      [`character_length('mysql-emulator')`, 14],
      [`char_length('mysql-emulator')`, 14],
      [`length('mysql-emulator')`, 14],
      [`lower('MYSQL-EMULATOR')`, 'mysql-emulator'],
      [`upper('mysql-emulator')`, 'MYSQL-EMULATOR'],
    ])('should run string function %s', async (expression, expected) => {
      expect(await query(`SELECT ${expression} v`)).toEqual([{ v: expected }]);
    });

    test.each([
      ['mod(5, 3)', 2],
      ['greatest(4, 3, 2, 1)', 4],
      [`greatest(4, '33', 2, 1)`, '4'],
      [`greatest(4, '33', 2, 1, null)`, null],
      ['ceil(25.25)', 26],
      ['ceiling(25.25)', 26],
      ['floor(25.75)', 25],
      ['round(25.57, 1)', '25.6'],
      ['round(25.52, 1)', '25.5'],
      ['round(25.25)', '25'],
      ['round(25.75)', '26'],
    ])('should run number function %s', async (expression, expected) => {
      expect(await query(`SELECT ${expression} v`)).toEqual([{ v: expected }]);
    });

    test.each([
      ['isnull(null)', 1],
      [`isnull('')`, 0],
      ['isnull(123)', 0],
      [`ifnull(null, 'one')`, 'one'],
      [`ifnull('', 'two')`, ''],
      ['ifnull(123, 3)', 123],
      [`ifnull(123, 'three')`, '123'],
      [`nullif('one', 'one')`, null],
      [`nullif('1', 1)`, null],
      [`nullif(1, '1')`, null],
      [`nullif(1, '2')`, 1],
      [`nullif('1', 2)`, '1'],
      [`if(null, 'yes', 'no')`, 'no'],
      [`if(5, 'yes', 'no')`, 'yes'],
      [`if(-5, 'yes', 'no')`, 'yes'],
      [`if('', 'yes', 'no')`, 'no'],
      [`if(true, 1, 'two')`, '1'],
      [`if(false, 1, 2)`, 2],
      [`coalesce(null, null, '', 'mysql', null)`, ''],
      ['coalesce(null)', null],
      [`CASE WHEN true THEN 'one' END`, 'one'],
      [`CASE WHEN false THEN 'one' WHEN true THEN 'two' END`, 'two'],
      [`CASE WHEN false THEN 'one' ELSE 'two' END`, 'two'],
      [`CASE WHEN false THEN 'one' END`, null],
    ])('should run boolean function %s', async (expression, expected) => {
      expect(await query(`SELECT ${expression} v`)).toEqual([{ v: expected }]);
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
    it('should ORDER BY alias', async () => {
      const res = await query(`SELECT p.name first_name FROM profiles p ORDER BY first_name`);

      expect(res).toEqual([{ first_name: 'Jane' }, { first_name: 'John' }, { first_name: 'John' }]);
    });
    it('should ORDER BY position', async () => {
      const res = await query(`SELECT p.name first_name FROM profiles p ORDER BY 1`);

      expect(res).toEqual([{ first_name: 'Jane' }, { first_name: 'John' }, { first_name: 'John' }]);
    });
    it('should ORDER BY alias to aggregate function', async () => {
      const res = await query(`SELECT p.name, COUNT(*) count FROM profiles p GROUP BY p.name ORDER BY count`);

      expect(res).toEqual([
        { name: 'Jane', count: 1 },
        { name: 'John', count: 2 },
      ]);
    });
    it('should ORDER BY aggregate function', async () => {
      const res = await query(`SELECT p.name, COUNT(*) count FROM profiles p GROUP BY p.name ORDER BY COUNT(*)`);

      expect(res).toEqual([
        { name: 'Jane', count: 1 },
        { name: 'John', count: 2 },
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
    it('should GROUP BY alias', async () => {
      const res = await query(`SELECT p.name first_name FROM profiles p GROUP BY first_name`);

      expect(res).toEqual([{ first_name: 'John' }, { first_name: 'Jane' }]);
    });
    it('should GROUP BY position', async () => {
      const res = await query(`SELECT p.name first_name FROM profiles p GROUP BY 1`);

      expect(res).toEqual([{ first_name: 'John' }, { first_name: 'Jane' }]);
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
    it('should not group by aggregate function', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT COUNT(*) FROM users u GROUP BY COUNT(*)`);
      } catch (err: any) {
        expect(err.message).toBe(`Can't group on 'COUNT(*)'`);
      }
    });
    it('should not group by position to aggregate function', async () => {
      expect.assertions(1);
      try {
        await query(`SELECT COUNT(*) FROM users u GROUP BY 1`);
      } catch (err: any) {
        expect(err.message).toBe(`Can't group on 'COUNT(*)'`);
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
    // node-sql-parser handles this case and throws an error: invalid column clause with select statement
    it.skip('should throw an error if sub query returns several columns', async () => {
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
