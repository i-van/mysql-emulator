import { Insert_Replace } from 'node-sql-parser/types';

const buildRow = (keys: any[], values: any[]) => keys.reduce((object, key, index) => ({
  ...object,
  [key]: values[index],
}), {});

export class InsertQuery {
  constructor(
    public databaseName: string,
    public tableName: string,
    public rows: any[],
  ) {}

  static fromAst(ast: Insert_Replace): InsertQuery {
    const [{ db, table }] = ast.table!;
    const rows = ast.values.map(({ value }) => {
      return buildRow(ast.columns!, value.map(i => i.value));
    });

    return new InsertQuery(db, table, rows);
  }
}
