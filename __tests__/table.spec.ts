import { query } from '../src';

describe('table', () => {
  beforeAll(async () => {
    await query(`CREATE TABLE users (id int, name varchar(255))`);
    await query(`INSERT INTO users (id, name) VALUES (1, 'name1'), (2, 'name2'), (3, 'name3')`);
  });

  it('should select all rows', async () => {
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

  it('should select names with aliases', async () => {
    const res = await query(`SELECT name as fullName from users`);

    expect(res).toEqual([
      { fullName: 'name1' },
      { fullName: 'name2' },
      { fullName: 'name3' },
    ]);
  });

  it('should select names with aliases', async () => {
    const res = await query(`SELECT name fullName from users`);

    expect(res).toEqual([
      { fullName: 'name1' },
      { fullName: 'name2' },
      { fullName: 'name3' },
    ]);
  });
});
