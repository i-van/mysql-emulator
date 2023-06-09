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
    await query(`
      CREATE TABLE student_profiles (
        student_id INT UNSIGNED NOT NULL,
        rating TINYINT NOT NULL,
        active TINYINT NOT NULL,
        updated_at DATETIME DEFAULT current_timestamp ON UPDATE current_timestamp,
        PRIMARY KEY (student_id)
      )
    `);
  });

  afterEach(async () => {
    await query(`DROP TABLE students`);
    await query(`DROP TABLE student_profiles`);
  });

  it('should insert default year', async () => {
    const res = await query(`INSERT INTO students (id, name, year) VALUES (1, 'John', DEFAULT)`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 1 }]);
  });
  it('should insert default year if it is not in column list', async () => {
    const res = await query(`INSERT INTO students (id, name) VALUES (1, 'John')`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 1 }]);
  });
  it('should insert values without columns', async () => {
    const res = await query(`INSERT INTO students VALUES (1, 'Jane', 2)`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'Jane', year: 2 }]);
  });
  it('should throw an error if column is unknown', async () => {
    expect.assertions(1);
    try {
      await query(`INSERT INTO students (user_name, year) VALUES ('John', 3)`);
    } catch (err: any) {
      expect(err.message).toBe(`Unknown column 'user_name' in 'field list'`);
    }
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
  it('should insert incremented id after inserting specific id', async () => {
    const res1 = await query(`INSERT INTO students VALUES (10, 'John', 3)`);
    const res2 = await query(`INSERT INTO students VALUES (default, 'Jane', 3)`);
    const rows = await query(`SELECT * from students`);

    expect(res1.insertId).toEqual(10);
    expect(res1.affectedRows).toEqual(1);
    expect(res2.insertId).toEqual(11);
    expect(res2.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 10, name: 'John', year: 3 },
      { id: 11, name: 'Jane', year: 3 },
    ]);
  });
  it('should insert expression on field', async () => {
    const res = await query(`INSERT INTO students VALUES (1, 'John', id * 2)`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 2 }]);
  });
  it('should throw an error if year is string', async () => {
    expect.assertions(1);
    try {
      await query(`INSERT INTO students VALUES (1, 'John', 'second')`);
    } catch (err: any) {
      expect(err.message).toBe(`Incorrect integer value: 'second' for column 'year' at row 1`);
    }
  });
  it('should throw an error if year is negative', async () => {
    expect.assertions(1);
    try {
      await query(`INSERT INTO students VALUES (1, 'John', -5)`);
    } catch (err: any) {
      expect(err.message).toBe(`Out of range value for column 'year' at row 1`);
    }
  });
  it('should cast string year to integer', async () => {
    const res = await query(`INSERT INTO students VALUES (1, 'John', '2')`);
    const rows = await query(`SELECT * from students`);

    expect(res.insertId).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([{ id: 1, name: 'John', year: 2 }]);
  });
  it('should cast boolean value to integer', async () => {
    const res = await query(`
      INSERT INTO student_profiles VALUES
        (1, 5, false, '2023-01-02 03:04:05'),
        (2, 4, true, '2023-01-02 03:04:05')
    `);
    const rows = await query(`SELECT * from student_profiles`);

    expect(res.insertId).toEqual(0);
    expect(res.affectedRows).toEqual(2);
    expect(rows).toEqual([
      { student_id: 1, rating: 5, active: 0, updated_at: new Date('2023-01-02 03:04:05') },
      { student_id: 2, rating: 4, active: 1, updated_at: new Date('2023-01-02 03:04:05') },
    ]);
  });

  describe('update on duplication', () => {
    it('should update existing row', async () => {
      await query(`INSERT INTO students VALUES (1, 'Jane', 2)`);
      const res = await query(`
        INSERT INTO students VALUES (1, 'John', DEFAULT)
        ON DUPLICATE KEY UPDATE name = VALUES(name), year = year + 1
      `);
      const rows = await query(`SELECT * FROM students`);

      expect(res.insertId).toEqual(1);
      expect(res.affectedRows).toEqual(2);
      expect(rows).toEqual([{ id: 1, name: 'John', year: 3 }]);
    });
    it('should not increment affectedRows twice if existing row has not changed', async () => {
      await query(`INSERT INTO students VALUES (1, 'Jane', DEFAULT)`);
      const res = await query(`
        INSERT INTO students VALUES (1, 'John', DEFAULT)
        ON DUPLICATE KEY UPDATE year = 1
      `);
      const rows = await query(`SELECT * FROM students`);

      expect(res.insertId).toEqual(0);
      expect(res.affectedRows).toEqual(1);
      expect(rows).toEqual([{ id: 1, name: 'Jane', year: 1 }]);
    });
    it('should auto update datetime field', async () => {
      await query(`INSERT INTO student_profiles VALUES (10, 5, false, '2023-01-02 03:04:05')`);
      const res = await query(`
        INSERT INTO student_profiles VALUES (10, 2, false, DEFAULT)
        ON DUPLICATE KEY UPDATE rating = rating + VALUES(rating)
      `);
      const rows = await query(`SELECT * FROM student_profiles`);

      expect(res.insertId).toEqual(0);
      expect(res.affectedRows).toEqual(2);
      expect(rows).toEqual([{ student_id: 10, rating: 7, active: 0, updated_at: expect.any(Date) }]);
      // less than 1 second
      expect(Date.now() - rows[0].updated_at).toBeLessThan(1000);
    });
  });
});
