import { query } from '../../src';

describe('delete', () => {
  beforeEach(async () => {
    await query(`CREATE TABLE authors (id int, name varchar(255))`);
    await query(`INSERT INTO authors (id, name) VALUES (1, 'name1'), (2, 'name2'), (3, 'name3')`);
  });

  afterEach(async () => {
    await query(`DROP TABLE authors`);
  });

  it('should delete all', async () => {
    await query(`DELETE FROM authors`);
    const res = await query(`SELECT * from authors`);

    expect(res).toEqual([]);
  });
  it(`should delete WHERE a.name = 'name2'`, async () => {
    await query(`DELETE FROM authors a WHERE a.name = 'name2'`);
    const res = await query(`SELECT * from authors`);

    expect(res).toEqual([
      { id: 1, name: 'name1' },
      { id: 3, name: 'name3' },
    ]);
  });
});
