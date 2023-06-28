import { query } from '../../src';

describe('update', () => {
  beforeEach(async () => {
    await query(`CREATE TABLE books (id int, name varchar(255), pages int unsigned)`);
    await query(`INSERT INTO books (id, name, pages) VALUES (1, 'name1', 100)`);
    await query(`INSERT INTO books (id, name, pages) VALUES (2, 'name2', 300)`);
    await query(`INSERT INTO books (id, name, pages) VALUES (3, 'name3', 500)`);

    await query(`
      CREATE TABLE booklets (
        id int,
        name varchar(255),
        updated_at datetime default '2023-01-02 03:04:05' on update current_timestamp
      )
    `);
    await query(`INSERT INTO booklets VALUES (1, 'booklet1', DEFAULT)`);
    await query(`INSERT INTO booklets VALUES (2, 'booklet2', current_timestamp)`);
    await query(`INSERT INTO booklets VALUES (3, 'booklet3', DEFAULT)`);
  });

  afterEach(async () => {
    await query(`DROP TABLE books`);
    await query(`DROP TABLE booklets`);
  });

  it('should update all', async () => {
    const res = await query(`UPDATE books SET name = 'new name'`);
    const rows = await query(`SELECT * from books`);

    expect(res.changedRows).toEqual(3);
    expect(res.affectedRows).toEqual(3);
    expect(rows).toEqual([
      { id: 1, name: 'new name', pages: 100 },
      { id: 2, name: 'new name', pages: 300 },
      { id: 3, name: 'new name', pages: 500 },
    ]);
  });
  it(`should update WHERE b.name = 'name2'`, async () => {
    const res = await query(`UPDATE books b SET b.name = 'new name' WHERE b.name = 'name2'`);
    const rows = await query(`SELECT * from books`);

    expect(res.changedRows).toEqual(1);
    expect(res.affectedRows).toEqual(1);
    expect(rows).toEqual([
      { id: 1, name: 'name1', pages: 100 },
      { id: 2, name: 'new name', pages: 300 },
      { id: 3, name: 'name3', pages: 500 },
    ]);
  });
  it(`should increment pages`, async () => {
    const res = await query(`UPDATE books b SET b.pages = b.pages + 1`);
    const rows = await query(`SELECT * from books`);

    expect(res.changedRows).toEqual(3);
    expect(res.affectedRows).toEqual(3);
    expect(rows).toEqual([
      { id: 1, name: 'name1', pages: 101 },
      { id: 2, name: 'name2', pages: 301 },
      { id: 3, name: 'name3', pages: 501 },
    ]);
  });
  it('should throw an error if pages is string', async () => {
    expect.assertions(1);
    try {
      await query(`UPDATE books b SET b.pages = 'many'`);
    } catch (err: any) {
      expect(err.message).toEqual(`Incorrect integer value: 'many' for column 'pages' at row 1`);
    }
  });
  it('should throw an error if pages is negative', async () => {
    expect.assertions(1);
    try {
      await query(`UPDATE books b SET b.pages = -100`);
    } catch (err: any) {
      expect(err.message).toEqual(`Out of range value for column 'pages' at row 1`);
    }
  });
  it('should cast string pages to integer', async () => {
    const res = await query(`UPDATE books b SET b.pages = '100'`);
    const rows = await query(`SELECT * from books`);

    expect(res.changedRows).toEqual(2);
    expect(res.affectedRows).toEqual(3);
    expect(rows).toEqual([
      { id: 1, name: 'name1', pages: 100 },
      { id: 2, name: 'name2', pages: 100 },
      { id: 3, name: 'name3', pages: 100 },
    ]);
  });
  it('should cast boolean pages to integer', async () => {
    await query(`UPDATE books b SET b.pages = true WHERE b.id = 1`);
    await query(`UPDATE books b SET b.pages = false WHERE b.id = 2`);
    const rows = await query(`SELECT * from books`);

    expect(rows).toEqual([
      { id: 1, name: 'name1', pages: 1 },
      { id: 2, name: 'name2', pages: 0 },
      { id: 3, name: 'name3', pages: 500 },
    ]);
  });
  it('should auto update datetime field', async () => {
    await query(`UPDATE booklets b SET b.name = concat(b.name, '_updated') WHERE b.id = 3`);
    const rows = await query(`SELECT * from booklets`);

    expect(rows).toEqual([
      { id: 1, name: 'booklet1', updated_at: new Date('2023-01-02 03:04:05') },
      { id: 2, name: 'booklet2', updated_at: expect.any(Date) },
      { id: 3, name: 'booklet3_updated', updated_at: expect.any(Date) },
    ]);
    // less than 1 sec
    expect(Date.now() - rows[1].updated_at).toBeLessThan(1000);
    expect(Date.now() - rows[2].updated_at).toBeLessThan(1000);
  });
  it('should not update datetime field if nothing has changed', async () => {
    const res = await query(`UPDATE booklets b SET b.name = 'booklet3' WHERE b.id = 3`);
    const rows = await query(`SELECT * from booklets`);

    expect(res.affectedRows).toBe(1);
    expect(res.changedRows).toBe(0);
    expect(rows).toEqual([
      { id: 1, name: 'booklet1', updated_at: new Date('2023-01-02 03:04:05') },
      { id: 2, name: 'booklet2', updated_at: expect.any(Date) },
      { id: 3, name: 'booklet3', updated_at: new Date('2023-01-02 03:04:05') },
    ]);
  });
  it('should update datetime field to assigned value', async () => {
    await query(`UPDATE booklets b SET b.updated_at = '2023-02-03 04:05:06' WHERE b.id = 3`);
    const rows = await query(`SELECT * from booklets`);

    expect(rows).toEqual([
      { id: 1, name: 'booklet1', updated_at: new Date('2023-01-02 03:04:05') },
      { id: 2, name: 'booklet2', updated_at: expect.any(Date) },
      { id: 3, name: 'booklet3', updated_at: new Date('2023-02-03 04:05:06') },
    ]);
  });
});
