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
        autoIncrement: true,
      },
      {
        name: 'name',
        dataType: 'VARCHAR',
        nullable: false,
        defaultValue: { type: 'string', value: '' },
        unsigned: null,
        length: 255,
        autoIncrement: null,
      },
    ]);
  });
});
