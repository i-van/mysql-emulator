import { InsertQuery, Parser } from '../../src/parser';

describe('insert query', () => {
  const parser = new Parser();

  it('should return InsertQuery', () => {
    const sql = `INSERT INTO students (id, name, year) VALUES (1, 'John', DEFAULT)`;
    const res = parser.parse(sql, []) as InsertQuery;

    expect(res).toBeInstanceOf(InsertQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('students');
    expect(res.columns).toEqual(['id', 'name', 'year']);
    expect(res.values).toEqual([
      [{ type: 'number', value: 1 }, { type: 'string', value: 'John' }, { type: 'default' }],
    ]);
    expect(res.onDuplicateUpdate).toEqual([]);
  });
  it('should return null columns', () => {
    const sql = `INSERT INTO students VALUES (1, 'John', DEFAULT)`;
    const res = parser.parse(sql, []) as InsertQuery;

    expect(res).toBeInstanceOf(InsertQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('students');
    expect(res.columns).toEqual(null);
    expect(res.values).toEqual([
      [{ type: 'number', value: 1 }, { type: 'string', value: 'John' }, { type: 'default' }],
    ]);
  });
  it('should return expression on value', () => {
    const sql = `INSERT INTO students VALUES (1, 'John', id * 2)`;
    const res = parser.parse(sql, []) as InsertQuery;

    expect(res).toBeInstanceOf(InsertQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('students');
    expect(res.columns).toEqual(null);
    expect(res.values).toEqual([
      [
        { type: 'number', value: 1 },
        { type: 'string', value: 'John' },
        {
          type: 'binary_expression',
          operator: '*',
          left: { type: 'column_ref', table: null, column: 'id' },
          right: { type: 'number', value: 2 },
        },
      ],
    ]);
  });
  it('should parse ON DUPLICATE KEY UPDATE', () => {
    const sql = `
      INSERT INTO students (id, name, year) VALUES (1, 'John', DEFAULT)
      ON DUPLICATE KEY UPDATE name = VALUES(name), year = year + 1
    `;
    const res = parser.parse(sql, []) as InsertQuery;

    expect(res).toBeInstanceOf(InsertQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('students');
    expect(res.columns).toEqual(['id', 'name', 'year']);
    expect(res.values).toEqual([
      [{ type: 'number', value: 1 }, { type: 'string', value: 'John' }, { type: 'default' }],
    ]);
    expect(res.onDuplicateUpdate).toEqual([
      {
        table: null,
        column: 'name',
        value: {
          type: 'function',
          name: 'values',
          args: [{ type: 'column_ref', table: null, column: 'name' }],
          options: {},
        },
      },
      {
        table: null,
        column: 'year',
        value: {
          type: 'binary_expression',
          operator: '+',
          left: { type: 'column_ref', table: null, column: 'year' },
          right: { type: 'number', value: 1 },
        },
      },
    ]);
  });
});
