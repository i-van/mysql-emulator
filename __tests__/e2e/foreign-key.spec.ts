import { query } from '../../src';

describe('foreign key', () => {
  beforeAll(async () => {
    await query(`CREATE TABLE phone_types (id INT, name VARCHAR(255), PRIMARY KEY (id))`);
    await query(`INSERT INTO phone_types VALUES (1, 'work'), (2, 'cell'), (3, 'fax')`);
  });
  afterEach(async () => {
    await query(`DROP TABLE IF EXISTS phones`);
  });
  afterAll(async () => {
    await query(`DROP TABLE IF EXISTS phone_types`);
  });

  it('should throw an error if referenced table is missing', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE phones (
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
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (\`type\`) REFERENCES phone_types (id)
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
        CREATE TABLE phones (
          id INT,
          type_id BIGINT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
        )
      `);
    } catch (err: any) {
      expect(err.message).toEqual(`Referencing column 'type_id' and referenced column 'id' in foreign key constraint 'phones_ibfk_1' are incompatible.`);
    }
  });
  it('should create a foreign key', async () => {
    expect.assertions(1);
    await query(`
      CREATE TABLE phones (
        id INT,
        type_id INT,
        CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
      )
    `);
    expect(1).toEqual(1);
  });
  it('should throw an error if referenced table has no such record during insertion', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 4)`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Cannot add or update a child row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/);
    }
  });
  it('should throw an error if referenced table has no such record during update', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 1)`);
      await query(`UPDATE phones SET type_id = 4`);
    } catch (err: any) {
      expect(err.message).toMatch(/^Cannot add or update a child row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/);
    }
  });
});
