import { Create } from 'node-sql-parser';
import { DataType } from '../server/table-column';

type Column = {
  name: string;
  dataType: DataType;
};
type CreateDefinition = {
  column: {
    column: string;
  };
  definition: {
    dataType: DataType;
  };
  resource: 'column' | 'constraint';
};

export class CreateTableQuery {
  constructor(
    public databaseName: string,
    public tableName: string,
    public columns: Column[],
    public constraints: any[],
  ) {}

  static fromAst(ast: Create): CreateTableQuery {
    const [{ db, table }] = ast.table!;

    const columns: Column[] = [];
    const constraints = [];
    for (const c of ast.create_definitions as CreateDefinition[]) {
      if (c.resource === 'column') {
        columns.push({
          name: c.column.column,
          dataType: c.definition.dataType,
        });
      } else if (c.resource === 'constraint') {
        // todo: implement
      }
    }

    return new CreateTableQuery(db, table, columns, constraints);
  }
}
