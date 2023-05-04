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
    await query(`INSERT INTO students (id, name, year) VALUES (1, 'John', DEFAULT)`);
    const res = await query(`SELECT * from students`);

    expect(res).toEqual([
      { id: 1, name: 'John', year: 1 },
    ]);
  });
  it('should insert default year if it is not in column list', async () => {
    await query(`INSERT INTO students (id, name) VALUES (1, 'John')`);
    const res = await query(`SELECT * from students`);

    expect(res).toEqual([
      { id: 1, name: 'John', year: 1 },
    ]);
  });
  it('should insert values without columns', async () => {
    await query(`INSERT INTO students VALUES (1, 'Jane', 2)`);
    const res = await query(`SELECT * from students`);

    expect(res).toEqual([
      { id: 1, name: 'Jane', year: 2 },
    ]);
  });
  it('should insert incremented id', async () => {
    await query(`INSERT INTO students (name, year) VALUES ('John', 3)`);
    await query(`INSERT INTO students (name, year) VALUES ('Jane', 3)`);
    const res = await query(`SELECT * from students`);

    expect(res).toEqual([
      { id: 1, name: 'John', year: 3 },
      { id: 2, name: 'Jane', year: 3 },
    ]);
  });
  it('should insert expression on field', async () => {
    await query(`INSERT INTO students VALUES (1, 'John', id * 2)`);
    const res = await query(`SELECT * from students`);

    expect(res).toEqual([
      { id: 1, name: 'John', year: 2 },
    ]);
  });
});
