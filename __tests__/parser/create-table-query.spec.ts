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
      },
    ]);
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
        columns: [
          { type: 'column_ref', table: null, column: 'id' },
        ],
      },
      {
        type: 'unique_index',
        name: 'id_name_idx',
        columns: [
          { type: 'column_ref', table: null, column: 'id' },
          { type: 'column_ref', table: null, column: 'name' },
        ],
      },
    ]);
  });
});
