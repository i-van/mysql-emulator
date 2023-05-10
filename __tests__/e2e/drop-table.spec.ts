import { query } from '../../src';

describe('drop-table', () => {
  it('should drop table if it existed', async () => {
    await query(`CREATE TABLE movies (id INT NOT NULL, name VARCHAR(255) NOT NULL)`);
    await query(`DROP TABLE movies`);

    try {
      await query(`SELECT * FROM movies`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Table '(.+)\.movies' doesn't exist$/);
    }
  });
  it('should throw an error if table did not exist', async () => {
    try {
      await query(`DROP TABLE movies`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Unknown table '(.+)\.movies'$/);
    }
  });
  it('should not throw an error if table did not exist', async () => {
    await query(`DROP TABLE IF EXISTS movies`);
    expect(1).toEqual(1);
  });
});
