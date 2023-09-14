import { query } from '../../src';

describe('unique-key', () => {
  beforeEach(async () => {
    await query(`
      CREATE TABLE reviewers (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY unique_name_idx (first_name,last_name)
      )
    `);
  });

  afterEach(async () => {
    await query(`DROP TABLE reviewers`);
  });

  it('should reject inserting the same primary ID', async () => {
    expect.assertions(1);
    try {
      await query(`INSERT INTO reviewers VALUES (1, 'John', 'Dow')`);
      await query(`INSERT INTO reviewers VALUES (1, 'Jane', 'Dow')`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Duplicate entry '1' for key '(.+)\.PRIMARY'$/);
    }
  });
  it('should reject inserting the same name', async () => {
    expect.assertions(1);
    try {
      await query(`INSERT INTO reviewers VALUES (DEFAULT, 'John', 'Dow')`);
      await query(`INSERT INTO reviewers VALUES (DEFAULT, 'John', 'Dow')`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Duplicate entry 'John-Dow' for key '(.+)\.unique_name_idx'$/);
    }
  });
  it('should reject updating row to the existing name', async () => {
    await query(`INSERT INTO reviewers VALUES (DEFAULT, 'John', 'Dow')`);
    await query(`INSERT INTO reviewers VALUES (DEFAULT, 'Jane', 'Dow')`);

    expect.assertions(1);
    try {
      await query(`UPDATE reviewers SET first_name = 'John' WHERE first_name = 'Jane'`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Duplicate entry 'John-Dow' for key '(.+)\.unique_name_idx'$/);
    }
  });
  it('should insert the previously existing name', async () => {
    await query(`INSERT INTO reviewers VALUES (DEFAULT, 'John', 'Dow')`);
    await query(`INSERT INTO reviewers VALUES (DEFAULT, 'Jane', 'Dow')`);
    await query(`DELETE FROM reviewers WHERE first_name = 'Jane'`);
    await query(`INSERT INTO reviewers VALUES (DEFAULT, 'Jane', 'Dow')`);

    const rows = await query(`SELECT * from reviewers ORDER BY id`);

    expect(rows).toEqual([
      { id: 1, first_name: 'John', last_name: 'Dow' },
      { id: 3, first_name: 'Jane', last_name: 'Dow' },
    ]);
  });
});
