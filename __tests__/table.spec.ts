import { query } from '../src';

describe('table', () => {
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

    expect(res).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
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

    expect(res).toEqual([
      { fullName: 'name1' },
      { fullName: 'name2' },
      { fullName: 'name3' },
    ]);
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

      expect(res).toEqual([
        { name: 'name1' },
        { name: 'name2' },
        { name: 'name3' },
      ]);
    });

    it('should select "t.name fullName" from aliased table', async () => {
      const res = await query(`SELECT t.name fullName from users t`);

      expect(res).toEqual([
        { fullName: 'name1' },
        { fullName: 'name2' },
        { fullName: 'name3' },
      ]);
    });
  });

  describe('where clause', () => {
    it('should filter by "u.id = 1"', async () => {
      const res = await query(`SELECT * from users u where u.id = 1`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
      ]);
    });
    it(`should filter by "u.id = '1'"`, async () => {
      const res = await query(`SELECT * from users u where u.id = '1'`);

      expect(res).toEqual([
        { id: 1, name: 'name1' },
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
    it('should filter by "u.id = 2 or u.id = 3"', async () => {
      const res = await query(`SELECT * from users u where u.id = 2 or u.id = 3`);

      expect(res).toEqual([
        { id: 2, name: 'name2' },
        { id: 3, name: 'name3' },
      ]);
    });
    it(`should filter by "u.id = 2 and u.name = 'name2'`, async () => {
      const res = await query(`SELECT * from users u where u.id = 2 and u.name = 'name2'`);

      expect(res).toEqual([
        { id: 2, name: 'name2' },
      ]);
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
  });
});
