import { query } from '../../src';

describe('update', () => {
  beforeEach(async () => {
    await query(`CREATE TABLE books (id int, name varchar(255), pages int unsigned)`);
    await query(`INSERT INTO books (id, name, pages) VALUES (1, 'name1', 100)`);
    await query(`INSERT INTO books (id, name, pages) VALUES (2, 'name2', 300)`);
    await query(`INSERT INTO books (id, name, pages) VALUES (3, 'name3', 500)`);
  });

  afterEach(async () => {
    await query(`DROP TABLE books`);
  });

  it('should update all', async () => {
    const res = await query(`UPDATE books SET name = 'new name'`);
    const rows = await query(`SELECT * from books`);

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

    expect(res.affectedRows).toEqual(3);
    expect(rows).toEqual([
      { id: 1, name: 'name1', pages: 101 },
      { id: 2, name: 'name2', pages: 301 },
      { id: 3, name: 'name3', pages: 501 },
    ]);
  });
  it('should throw an error if pages is string', async () => {
    try {
      await query(`UPDATE books b SET b.pages = 'many'`);
    } catch (err: any) {
      expect(err.message).toEqual(`Incorrect integer value: 'many' for column 'pages' at row 1`);
    }
  });
  it('should throw an error if pages is negative', async () => {
    try {
      await query(`UPDATE books b SET b.pages = -100`);
    } catch (err: any) {
      expect(err.message).toEqual(`Out of range value for column 'pages' at row 1`);
    }
  });
  it('should cast string pages to integer', async () => {
    const res = await query(`UPDATE books b SET b.pages = '100'`);
    const rows = await query(`SELECT * from books`);

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
});
