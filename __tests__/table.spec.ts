import { query } from '../src';

describe('table', () => {
  beforeAll(async () => {
    await query(`CREATE TABLE users (id int, name varchar(255))`);
    await query(`INSERT INTO users (id, name) VALUES (1, 'name1'), (2, 'name2'), (3, 'name3')`);
  });

  afterAll(async () => {
    await query(`DROP TABLE users`);
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
});
