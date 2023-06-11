import { query } from '../../src';

describe('create-table', () => {
  afterEach(async () => {
    await query(`DROP TABLE IF EXISTS companies`);
  });

  it('should throw an error if table exists', async () => {
    expect.assertions(1);
    try {
      await query(`CREATE TABLE companies (id INT)`);
      await query(`CREATE TABLE companies (id INT)`);
    } catch (err: any) {
      expect(err.message).toEqual(`Table 'companies' already exists`);
    }
  });
  it('should skip crating table if table already exists', async () => {
    await query(`CREATE TABLE companies (id INT)`);
    await query(`CREATE TABLE IF NOT EXISTS companies (id INT)`);
    expect(1).toEqual(1);
  });
  it('should create table with enum field', async () => {
    await query(`
      CREATE TABLE \`companies\` (
        \`status\` enum ('pending','rejected','approved') NOT NULL DEFAULT 'pending'
      )
    `);
    const res = await query(`SELECT * FROM companies`);

    expect(res).toEqual([]);
  });
  it('should throw an error if enum default value is not in values', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE \`companies\` (
          \`status\` enum ('pending','rejected','approved') NOT NULL DEFAULT 'another_status'
        )
      `);
    } catch (err: any) {
      expect(err.message).toEqual(`Invalid default value for 'status'`);
    }
  });
  it('should drop table if query fails', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE \`companies\` (
          \`status\` enum ('pending','rejected','approved') NOT NULL DEFAULT 'another_status'
        )
      `);
    } catch (err: any) {
      const [{ databaseName }] = await query(`SELECT database() databaseName`);
      const tables = await query('SHOW TABLES');
      const exists = tables.some((row) => row[`Tables_in_${databaseName}`] === 'companies')
      expect(exists).toBe(false);
    }
  });
});
