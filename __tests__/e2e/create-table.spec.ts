import { query } from '../../src';

describe('create-table', () => {
  afterEach(async () => {
    await query(`DROP TABLE IF EXISTS companies`);
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
});
