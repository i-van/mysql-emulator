import { CreateTableQuery, Parser } from '../../src/parser';

describe('create table query', () => {
  const parser = new Parser();

  it('should return CreateTableQuery', () => {
    const sql = `
      CREATE TABLE \`companies\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL DEFAULT '',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.columns).toEqual([
      {
        name: 'id',
        dataType: 'INT',
        nullable: false,
        defaultValue: null,
        unsigned: true,
        length: null,
        enumValues: null,
        autoIncrement: true,
        onUpdateCurrentTimestamp: null,
      },
      {
        name: 'name',
        dataType: 'VARCHAR',
        nullable: false,
        defaultValue: { type: 'string', value: '' },
        unsigned: null,
        length: 255,
        enumValues: null,
        autoIncrement: null,
        onUpdateCurrentTimestamp: null,
      },
    ]);
  });
  it('should parse IF NOT EXISTS', () => {
    const sql = `CREATE TABLE IF NOT EXISTS companies (id int)`;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.ifNotExists).toBe(true);
  });
  it('should parse enum dataType', () => {
    const sql = `
      CREATE TABLE \`companies\` (
        \`status\` enum ('pending','rejected','approved') NOT NULL DEFAULT 'pending'
      )
    `;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.columns).toEqual([
      {
        name: 'status',
        dataType: 'ENUM',
        nullable: false,
        defaultValue: { type: 'string', value: 'pending' },
        unsigned: null,
        length: null,
        enumValues: { type: 'array', value: ['pending', 'rejected', 'approved'] },
        autoIncrement: null,
        onUpdateCurrentTimestamp: null,
      },
    ]);
  });
  it('should parse constraints', () => {
    const sql = `
      CREATE TABLE \`companies\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL DEFAULT '',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`id_name_idx\` (\`id\`,\`name\`)
      ) ENGINE=InnoDB
    `;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.constraints).toEqual([
      {
        type: 'primary_key',
        name: 'PRIMARY',
        columns: [{ type: 'column_ref', table: null, column: 'id' }],
      },
      {
        type: 'unique_key',
        name: 'id_name_idx',
        columns: [
          { type: 'column_ref', table: null, column: 'id' },
          { type: 'column_ref', table: null, column: 'name' },
        ],
      },
    ]);
  });
  it('should parse nullable fields', () => {
    const sql = `
      CREATE TABLE companies (
        nullable_field_1 INT,
        nullable_field_2 INT NULL,
        not_nullable_field INT NOT NULL
      )
    `;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.columns).toEqual([
      {
        name: 'nullable_field_1',
        dataType: 'INT',
        nullable: true,
        defaultValue: null,
        unsigned: false,
        length: null,
        enumValues: null,
        autoIncrement: null,
        onUpdateCurrentTimestamp: null,
      },
      {
        name: 'nullable_field_2',
        dataType: 'INT',
        nullable: true,
        defaultValue: null,
        unsigned: false,
        length: null,
        enumValues: null,
        autoIncrement: null,
        onUpdateCurrentTimestamp: null,
      },
      {
        name: 'not_nullable_field',
        dataType: 'INT',
        nullable: false,
        defaultValue: null,
        unsigned: false,
        length: null,
        enumValues: null,
        autoIncrement: null,
        onUpdateCurrentTimestamp: null,
      },
    ]);
  });
  it('should parse ON UPDATE', () => {
    const sql = `
      CREATE TABLE companies (
        ts TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        dt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.columns).toEqual([
      {
        name: 'ts',
        dataType: 'TIMESTAMP',
        nullable: true,
        defaultValue: null,
        unsigned: null,
        length: null,
        enumValues: null,
        autoIncrement: null,
        onUpdateCurrentTimestamp: true,
      },
      {
        name: 'dt',
        dataType: 'DATETIME',
        nullable: true,
        defaultValue: {
          type: 'function',
          name: 'current_timestamp',
          args: [],
          options: {},
        },
        unsigned: null,
        length: null,
        enumValues: null,
        autoIncrement: null,
        onUpdateCurrentTimestamp: true,
      },
    ]);
  });
  it('should parse FOREIGN KEY', () => {
    const sql = `
      CREATE TABLE companies (
        \`user_id\` int UNSIGNED NOT NULL,
        CONSTRAINT FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL
      )
    `;
    const res = parser.parse(sql, []) as CreateTableQuery;

    expect(res).toBeInstanceOf(CreateTableQuery);
    expect(res.database).toBe(null);
    expect(res.table).toBe('companies');
    expect(res.constraints).toEqual([
      {
        name: 'companies_ibfk_1',
        type: 'foreign_key',
        columns: [
          { type: 'column_ref', table: null, column: 'user_id' },
        ],
        reference: {
          table: 'users',
          columns: [
            { type: 'column_ref', table: null, column: 'id' },
          ],
          actions: [
            { type: 'on update', value: 'cascade' },
            { type: 'on delete', value: 'set null' },
          ],
        },
      },
    ]);
  });
});
