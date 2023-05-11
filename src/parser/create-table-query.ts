import { Create } from 'node-sql-parser';
import { buildExpression, ColumnRef, Expression } from './expression';

export type DataType =
  | 'TINYINT' | 'SMALLINT' | 'MEDIUMINT' | 'INT' | 'INTEGER' | 'BIGINT'
  | 'DECIMAL' | 'FLOAT' | 'DOUBLE'
  | 'TINYTEXT' | 'TEXT' | 'MEDIUMTEXT' | 'LONGTEXT'
  | 'CHAR' | 'VARCHAR'
  | 'BINARY' | 'VARBINARY'
  | 'TINYBLOB' | 'BLOB' | 'MEDIUMBLOB' | 'LONGBLOB'
  | 'TIMESTAMP' | 'DATETIME' | 'DATE' | 'TIME' | 'YEAR'
  | 'ENUM';
export type CreateColumn = {
  name: string;
  dataType: DataType;
  nullable: boolean;
  defaultValue: Expression | null;
  unsigned: boolean | null;
  length: number | null;
  enumValues: Expression | null;
  autoIncrement: boolean | null;
};
type ColumnDefinition = {
  column: ColumnRef;
  definition: {
    dataType: DataType;
    suffix?: string[];
    length?: number;
    expr?: object;
  };
  nullable?: {
    type: 'not null';
    value: 'not null';
  };
  auto_increment?: 'auto_increment';
  default_val?: {
    type: 'default';
    value: object;
  };
  resource: 'column';
};
type ConstraintDefinition = {
  definition: ColumnRef[];
  resource: 'constraint';
};
type CreateDefinition = ColumnDefinition | ConstraintDefinition;

export class CreateTableQuery {
  constructor(
    public database: string | null,
    public table: string,
    public columns: CreateColumn[],
    public constraints: any[],
  ) {}

  static fromAst(ast: Create): CreateTableQuery {
    const [{ db, table }] = ast.table!;

    const columns: CreateColumn[] = [];
    const constraints = [];
    for (const c of ast.create_definitions as CreateDefinition[]) {
      if (c.resource === 'column') {
        columns.push({
          name: c.column.column,
          dataType: c.definition.dataType,
          defaultValue: c.default_val?.value
            ? buildExpression(c.default_val.value, new Map())
            : null,
          nullable: !c.nullable,
          unsigned: c.definition.suffix ? c.definition.suffix.includes('UNSIGNED') : null,
          length: c.definition.length ? c.definition.length : null,
          enumValues: c.definition.dataType === 'ENUM'
            ? buildExpression(c.definition.expr, new Map())
            : null,
          autoIncrement: c.auto_increment ? true : null,
        });
      } else if (c.resource === 'constraint') {
        // todo: implement
      }
    }

    return new CreateTableQuery(db, table, columns, constraints);
  }
}
