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
    } catch (err: any) {
      const [{ databaseName }] = await query(`SELECT database() databaseName`);
      const tables = await query('SHOW TABLES');
      const exists = tables.some((row) => row[`Tables_in_${databaseName}`] === 'companies');
      expect(exists).toBe(false);
    }
  });

  describe('foreign key', () => {
    beforeAll(async () => {
      await query(`CREATE TABLE company_types (id INT, name VARCHAR(255), PRIMARY KEY (id))`);
    });
    afterAll(async () => {
      await query(`DROP TABLE IF EXISTS company_types`);
    });

    it('should throw an error if referenced table is missing', async () => {
      expect.assertions(1);
      try {
        await query(`
          CREATE TABLE companies (
            id INT,
            region_id INT,
            CONSTRAINT FOREIGN KEY (region_id) REFERENCES regions (id)
          )
        `);
      } catch (err: any) {
        expect(err.message).toEqual(`Failed to open the referenced table 'regions'`);
      }
    });
    it('should throw an error if referencing column does not exist', async () => {
      expect.assertions(1);
      try {
        await query(`
          CREATE TABLE companies (
            id INT,
            type_id INT,
            CONSTRAINT FOREIGN KEY (\`type\`) REFERENCES company_types (id)
          )
        `);
      } catch (err: any) {
        expect(err.message).toEqual(`Key column 'type' doesn't exist in table`);
      }
    });
    it('should throw an error if referencing and referenced columns are incompatible', async () => {
      expect.assertions(1);
      try {
        await query(`
          CREATE TABLE companies (
            id INT,
            type_id BIGINT,
            CONSTRAINT FOREIGN KEY (type_id) REFERENCES company_types (id)
          )
        `);
      } catch (err: any) {
        expect(err.message).toEqual(`Referencing column 'type_id' and referenced column 'id' in foreign key constraint 'companies_ibfk_1' are incompatible.`);
      }
    });
    it('should create a foreign key', async () => {
      expect.assertions(1);
      await query(`
        CREATE TABLE companies (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES company_types (id)
        )
      `);
      expect(1).toEqual(1);
    });
  });
});
