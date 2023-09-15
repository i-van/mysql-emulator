import { query } from '../../src';

describe('foreign key', () => {
  beforeEach(async () => {
    await query(`CREATE TABLE phone_types (id INT, name VARCHAR(255), PRIMARY KEY (id))`);
    await query(`INSERT INTO phone_types VALUES (1, 'work'), (2, 'cell'), (3, 'fax')`);
  });
  afterEach(async () => {
    await query(`DROP TABLE IF EXISTS phones`);
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
      expect(err.message).toEqual(
        `Referencing column 'type_id' and referenced column 'id' in foreign key constraint 'phones_ibfk_1' are incompatible.`,
      );
    }
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
      expect(err.message).toMatch(
        /^Cannot add or update a child row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/,
      );
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
      expect(err.message).toMatch(
        /^Cannot add or update a child row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/,
      );
    }
  });
  it('should throw an error if referencing column is not nullable and action is set null', async () => {
    expect.assertions(1);
    try {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT NOT NULL,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
          ON UPDATE set null ON DELETE set null
        )
      `);
    } catch (err: any) {
      expect(err.message).toEqual(
        `Column 'type_id' cannot be NOT NULL: needed in a foreign key constraint 'phones_ibfk_1' SET NULL`,
      );
    }
  });

  describe('no action', () => {
    beforeEach(async () => {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 1)`);
    });
    it('should restrict updating for the parent table', async () => {
      expect.assertions(1);
      try {
        await query(`UPDATE phone_types SET id = 5 WHERE id = 1`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^Cannot delete or update a parent row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/,
        );
      }
    });
    it('should restrict deleting for the parent table', async () => {
      expect.assertions(1);
      try {
        await query(`DELETE FROM phone_types WHERE id = 1`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^Cannot delete or update a parent row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/,
        );
      }
    });
    it('should update parent row if it has no connection', async () => {
      await query(`UPDATE phone_types SET id = 5 WHERE id = 3`);

      const rows = await query(`SELECT * FROM phone_types`);
      expect(rows).toEqual([
        { id: 1, name: 'work' },
        { id: 2, name: 'cell' },
        { id: 5, name: 'fax' },
      ]);
    });
    it('should delete parent row if it has no connection', async () => {
      await query(`DELETE FROM phone_types WHERE id = 2`);

      const rows = await query(`SELECT * FROM phone_types`);
      expect(rows).toEqual([
        { id: 1, name: 'work' },
        { id: 3, name: 'fax' },
      ]);
    });
  });

  describe('restrict action', () => {
    beforeEach(async () => {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
          ON UPDATE restrict ON DELETE restrict
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 1)`);
    });
    it('should restrict updating for the parent table', async () => {
      expect.assertions(1);
      try {
        await query(`UPDATE phone_types SET id = 5 WHERE id = 1`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^Cannot delete or update a parent row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\) ON DELETE RESTRICT ON UPDATE RESTRICT\)$/,
        );
      }
    });
    it('should restrict deleting for the parent table', async () => {
      expect.assertions(1);
      try {
        await query(`DELETE FROM phone_types WHERE id = 1`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^Cannot delete or update a parent row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\) ON DELETE RESTRICT ON UPDATE RESTRICT\)$/,
        );
      }
    });
    it('should update parent row if it has no connection', async () => {
      await query(`UPDATE phone_types SET id = 5 WHERE id = 3`);

      const rows = await query(`SELECT * FROM phone_types`);
      expect(rows).toEqual([
        { id: 1, name: 'work' },
        { id: 2, name: 'cell' },
        { id: 5, name: 'fax' },
      ]);
    });
    it('should delete parent row if it has no connection', async () => {
      await query(`DELETE FROM phone_types WHERE id = 2`);

      const rows = await query(`SELECT * FROM phone_types`);
      expect(rows).toEqual([
        { id: 1, name: 'work' },
        { id: 3, name: 'fax' },
      ]);
    });
  });

  describe('set default action', () => {
    beforeEach(async () => {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
          ON UPDATE set default ON DELETE set default
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 1)`);
    });
    it('should restrict updating for the parent table', async () => {
      expect.assertions(1);
      try {
        await query(`UPDATE phone_types SET id = 5 WHERE id = 1`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^Cannot delete or update a parent row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/,
        );
      }
    });
    it('should restrict deleting for the parent table', async () => {
      expect.assertions(1);
      try {
        await query(`DELETE FROM phone_types WHERE id = 1`);
      } catch (err: any) {
        expect(err.message).toMatch(
          /^Cannot delete or update a parent row: a foreign key constraint fails \((.*)`phones`, CONSTRAINT `phones_ibfk_1` FOREIGN KEY \(`type_id`\) REFERENCES `phone_types` \(`id`\)\)$/,
        );
      }
    });
    it('should update parent row if it has no connection', async () => {
      await query(`UPDATE phone_types SET id = 5 WHERE id = 3`);

      const rows = await query(`SELECT * FROM phone_types`);
      expect(rows).toEqual([
        { id: 1, name: 'work' },
        { id: 2, name: 'cell' },
        { id: 5, name: 'fax' },
      ]);
    });
    it('should delete parent row if it has no connection', async () => {
      await query(`DELETE FROM phone_types WHERE id = 2`);

      const rows = await query(`SELECT * FROM phone_types`);
      expect(rows).toEqual([
        { id: 1, name: 'work' },
        { id: 3, name: 'fax' },
      ]);
    });
  });

  describe('cascade action', () => {
    beforeEach(async () => {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
          ON UPDATE cascade ON DELETE cascade
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 1)`);
    });
    it('should update child rows if parent is changed', async () => {
      await query(`UPDATE phone_types SET id = 5 WHERE id = 1`);

      const rows = await query(`SELECT * FROM phones`);
      expect(rows).toEqual([{ id: 1, type_id: 5 }]);
    });
    it('should delete child rows if parent is delete', async () => {
      await query(`DELETE FROM phone_types WHERE id = 1`);

      const rows = await query(`SELECT * FROM phones`);
      expect(rows).toEqual([]);
    });
  });

  describe('set null action', () => {
    beforeEach(async () => {
      await query(`
        CREATE TABLE phones (
          id INT,
          type_id INT,
          CONSTRAINT FOREIGN KEY (type_id) REFERENCES phone_types (id)
          ON UPDATE set null ON DELETE set null
        )
      `);
      await query(`INSERT INTO phones VALUES(1, 1)`);
    });
    it('should update child rows if parent is changed', async () => {
      await query(`UPDATE phone_types SET id = 5 WHERE id = 1`);

      const rows = await query(`SELECT * FROM phones`);
      expect(rows).toEqual([{ id: 1, type_id: null }]);
    });
    it('should update child rows if parent is delete', async () => {
      await query(`DELETE FROM phone_types WHERE id = 1`);

      const rows = await query(`SELECT * FROM phones`);
      expect(rows).toEqual([{ id: 1, type_id: null }]);
    });
  });
});
