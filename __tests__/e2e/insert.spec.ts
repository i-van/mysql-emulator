import { query } from '../../src';

describe('insert', () => {
  beforeEach(async () => {
    await query(`
      CREATE TABLE students (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        year INT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id)
      )
    `);
  });

  afterEach(async () => {
    await query(`DROP TABLE students`);
  });

  it('should insert default year', async () => {
    const res = await query(`INSERT INTO students (id, name, year) VALUES (1, 'John', DEFAULT)`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 1, name: 'John', year: 1 },
    ]);
  });
  it('should insert default year if it is not in column list', async () => {
    const res = await query(`INSERT INTO students (id, name) VALUES (1, 'John')`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 1, name: 'John', year: 1 },
    ]);
  });
  it('should insert values without columns', async () => {
    const res = await query(`INSERT INTO students VALUES (1, 'Jane', 2)`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 1, name: 'Jane', year: 2 },
    ]);
  });
  it('should insert incremented id', async () => {
    const res1 = await query(`INSERT INTO students (name, year) VALUES ('John', 3)`);
    const res2 = await query(`INSERT INTO students (name, year) VALUES ('Jane', 3)`);
    const rows = await query(`SELECT * from students`);

    expect(res1.insertId).toEqual(1);
    expect(res1.affectedRows).toEqual(1);
    expect(res2.insertId).toEqual(2);
    expect(res2.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 1, name: 'John', year: 3 },
      { id: 2, name: 'Jane', year: 3 },
    ]);
  });
  it('should insert expression on field', async () => {
    const res = await query(`INSERT INTO students VALUES (1, 'John', id * 2)`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 1, name: 'John', year: 2 },
    ]);
  });
});
