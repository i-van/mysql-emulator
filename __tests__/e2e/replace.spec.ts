import { query } from '../../src';

describe('replace', () => {
  beforeEach(async () => {
    await query(`
      CREATE TABLE pupils (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        year INT UNSIGNED NOT NULL DEFAULT 1,
        active TINYINT NOT NULL DEFAULT true,
        PRIMARY KEY (id)
      )
    `);
  });

  afterEach(async () => {
    await query(`DROP TABLE pupils`);
  });

  it('should insert default values', async () => {
    const res = await query(`REPLACE INTO pupils VALUES (1, 'John', DEFAULT, DEFAULT)`);
    const rows = await query(`SELECT * from pupils`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 1, active: 1 }]);
  });
  it('should insert default values if they are not in column list', async () => {
    const res = await query(`REPLACE INTO pupils (id, name) VALUES (1, 'John')`);
    const rows = await query(`SELECT * from pupils`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 1, active: 1 }]);
  });
  it('should throw an error if column is unknown', async () => {
    expect.assertions(1);
    try {
      await query(`REPLACE INTO pupils (user_name, year) VALUES ('John', 3)`);
    } catch (err: any) {
      expect(err.message).toBe(`Unknown column 'user_name' in 'field list'`);
    }
  });
  it('should throw an error if year is string', async () => {
    expect.assertions(1);
    try {
      await query(`REPLACE INTO pupils VALUES (1, 'John', 'second', DEFAULT)`);
    } catch (err: any) {
      expect(err.message).toBe(`Incorrect integer value: 'second' for column 'year' at row 1`);
    }
  });
  it('should cast values', async () => {
    const res = await query(`REPLACE INTO pupils VALUES (1, 'John', '2', false)`);
    const rows = await query(`SELECT * from pupils`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 2, active: 0 }]);
  });
  it('should replace existing row', async () => {
    await query(`REPLACE INTO pupils VALUES (1, 'Jane', 2, false)`);
    const res = await query(`REPLACE INTO pupils VALUES (1, 'John', DEFAULT, DEFAULT)`);
    const rows = await query(`SELECT * FROM pupils`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(2);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 1, active: 1 }]);
  });
  it('should not increment affectedRows twice if existing row has not changed', async () => {
    await query(`REPLACE INTO pupils VALUES (1, 'Jane', 5, false)`);
    const res = await query(`REPLACE INTO pupils VALUES (1, 'Jane', 5, false)`);
    const rows = await query(`SELECT * FROM pupils`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'Jane', year: 5, active: 0 }]);
  });
});
