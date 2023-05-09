import { query } from '../../src';

describe('drop-table', () => {
  it('should drop table if it existed', async () => {
    await query(`CREATE TABLE books (id INT NOT NULL, name VARCHAR(255) NOT NULL)`);
    await query(`DROP TABLE books`);

    try {
      await query(`SELECT * FROM books`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Table '(.+)\.books' doesn't exist$/);
    }
  });
  it('should throw an error if table did not exist', async () => {
    try {
      await query(`DROP TABLE books`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Unknown table '(.+)\.books'$/);
    }
  });
  it('should not throw an error if table did not exist', async () => {
    await query(`DROP TABLE IF EXISTS books`);
    expect(1).toEqual(1);
  });
});
