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
  it('should allow to set default value to NULL', async () => {
    await query(`
      CREATE TABLE \`companies\` (
        \`status\` enum ('pending','rejected','approved') DEFAULT NULL
      )
    `);
    expect(1).toEqual(1);
  });
  it('should not allow to set default value to NULL to not nullable field', async () => {
    expect.assertions(1);
    try {
      await query('CREATE TABLE companies (`name` varchar(30) NOT NULL DEFAULT NULL)');
    } catch (err: any) {
      expect(err.message).toEqual(`Invalid default value for 'name'`);
    }
  });
  it('should allow to create not nullable field', async () => {
    await query('CREATE TABLE companies (`name` varchar(30) NOT NULL)');
    expect(1).toEqual(1);
  });
  it('should drop table if query fails', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE \`companies\` (
          \`status\` enum ('pending','rejected','approved') NOT NULL DEFAULT 'another_status'
        )
      `);
    } catch {
      const [{ databaseName }] = await query(`SELECT database() databaseName`);
      const tables = await query('SHOW TABLES');
      const exists = tables.some((row) => row[`Tables_in_${databaseName}`] === 'companies');
      expect(exists).toBe(false);
    }
  });
});
