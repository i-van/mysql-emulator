import { query } from '../../src';

describe('transaction', () => {
  beforeEach(async () => {
    await query('CREATE TABLE apples (id int, name varchar(255))');
    await query(`INSERT INTO apples VALUES (1, 'alice')`);
    await query(`INSERT INTO apples VALUES (2, 'fuji')`);
  });

  afterEach(async () => {
    await query(`DROP TABLE apples`);
  });

  it('should commit transaction', async () => {
    await query('START TRANSACTION');
    await query(`DELETE FROM apples WHERE name = 'alice'`);
    await query(`INSERT INTO apples VALUES (3, 'gala')`);
    await query(`UPDATE apples SET name = 'gloster' WHERE name = 'fuji'`);
    await query('COMMIT');

    const res = await query('SELECT * FROM apples');

    expect(res).toEqual([
      { id: 2, name: 'gloster' },
      { id: 3, name: 'gala' },
    ]);
  });
  it('should rollback transaction', async () => {
    await query('START TRANSACTION');
    await query(`DELETE FROM apples WHERE name = 'alice'`);
    await query(`INSERT INTO apples VALUES (3, 'gala')`);
    await query(`UPDATE apples SET name = 'gloster' WHERE name = 'fuji'`);
    await query('ROLLBACK');

    const res = await query('SELECT * FROM apples');

    expect(res).toEqual([
      { id: 1, name: 'alice' },
      { id: 2, name: 'fuji' },
    ]);
  });
});
