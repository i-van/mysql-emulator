import { query } from '../../src';

describe('select', () => {
  let databaseName: string;

  beforeAll(async () => {
    [{ databaseName }] = await query(`SELECT database() databaseName`);
  });

  beforeAll(async () => {
    await query(`CREATE TABLE heroes (id int)`);
  });

  afterAll(async () => {
    await query(`DROP TABLE heroes`);
  });

  it('should show tables', async () => {
    const res = await query(`SHOW TABLES`);

    expect(res.some((row) => row[`Tables_in_${databaseName}`] === 'heroes')).toBe(true);
  });
  it('should show databases', async () => {
    const res = await query(`SHOW DATABASES`);

    expect(res.some((row) => row['Database'] === databaseName)).toBe(true);
  });
});
