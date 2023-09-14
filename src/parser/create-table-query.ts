import { Create } from 'node-sql-parser';
import { buildExpression, ColumnRef, Expression } from './expression';
import { ParserException } from './parser.exception';

export type DataType =
  | 'TINYINT'
  | 'SMALLINT'
  | 'MEDIUMINT'
  | 'INT'
  | 'INTEGER'
  | 'BIGINT'
  | 'DECIMAL'
  | 'FLOAT'
  | 'DOUBLE'
  | 'TINYTEXT'
  | 'TEXT'
  | 'MEDIUMTEXT'
  | 'LONGTEXT'
  | 'CHAR'
  | 'VARCHAR'
  | 'BINARY'
  | 'VARBINARY'
  | 'TINYBLOB'
  | 'BLOB'
  | 'MEDIUMBLOB'
  | 'LONGBLOB'
  | 'TIMESTAMP'
  | 'DATETIME'
  | 'DATE'
  | 'TIME'
  | 'YEAR'
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
  onUpdateCurrentTimestamp: boolean | null;
};
type UniqueKeyConstraint = {
  name: string;
  type: 'primary_key' | 'unique_key';
  columns: ColumnRef[];
};
export type ForeignKeyConstraint = {
  name: string;
  type: 'foreign_key';
  columns: ColumnRef[];
  reference: {
    table: string;
    columns: ColumnRef[];
    actions: {
      type: 'on update' | 'on delete';
      value: 'restrict' | 'cascade' | 'set null' | 'no action' | 'set default';
    }[];
  };
}
export type CreateConstraint = UniqueKeyConstraint | ForeignKeyConstraint;
type ColumnDefinition = {
  column: ColumnRef;
  definition: {
    dataType: DataType;
    suffix?: string[];
    length?: number;
    expr?: object;
  };
  nullable?: {
    type: 'not null' | 'null';
    value: 'not null' | 'null';
  };
  auto_increment?: 'auto_increment';
  default_val?: {
    type: 'default';
    value: {
      [k: string]: any;
      over?: { type: 'on update'; keyword: 'CURRENT_TIMESTAMP' };
    };
  };
  resource: 'column';
  reference_definition?: {
    on_action: { type: 'on update'; value: 'current_timestamp' }[];
  };
};
type KeyDefinition = {
  definition: ColumnRef[];
  constraint_type: 'primary key' | 'unique key' | 'unique index';
  index?: string;
  resource: 'constraint';
};
type ForeignKeyDefinition = {
  definition: ColumnRef[];
  constraint_type: 'foreign key';
  constraint?: string;
  resource: 'constraint';
  reference_definition: {
    definition: ColumnRef[];
    table: {
      db: null;
      table: string;
      as: null;
    }[];
    on_action: {
      type: 'on update' | 'on delete';
      value: { type: 'origin', value: 'restrict' | 'cascade' | 'set null' | 'no action' | 'set default' };
    }[];
  };
};
type CreateDefinition = ColumnDefinition | KeyDefinition | ForeignKeyDefinition;

const isForeignKeyDefinition = (d: KeyDefinition | ForeignKeyDefinition): d is ForeignKeyDefinition => {
  return d.constraint_type.toLowerCase() === 'foreign key';
};

const buildConstraint = (
  d: KeyDefinition | ForeignKeyDefinition,
  foreignKeyNameGenerator: () => string,
): CreateConstraint => {
  if (d.constraint_type === 'primary key') {
    return {
      name: 'PRIMARY',
      type: 'primary_key',
      columns: d.definition.map(buildExpression) as ColumnRef[],
    };
  } else if (d.constraint_type === 'unique key' || d.constraint_type === 'unique index') {
    return {
      name: d.index || d.definition[0].column,
      type: 'unique_key',
      columns: d.definition.map(buildExpression) as ColumnRef[],
    };
  } else if (isForeignKeyDefinition(d)) {
    return {
      name: d.constraint || foreignKeyNameGenerator(),
      type: 'foreign_key',
      columns: d.definition.map(buildExpression) as ColumnRef[],
      reference: {
        table: d.reference_definition.table[0].table,
        columns: d.reference_definition.definition.map(buildExpression) as ColumnRef[],
        actions: (d.reference_definition.on_action || []).map((a) => ({
          type: a.type,
          value: a.value.value,
        })),
      },
    };
  } else {
    throw new ParserException(`Unknown constraint type ${d.constraint_type}`);
  }
}

export class CreateTableQuery {
  constructor(
    public database: string | null,
    public table: string,
    public columns: CreateColumn[],
    public constraints: CreateConstraint[],
    public ifNotExists: boolean,
  ) {}

  static fromAst(ast: Create): CreateTableQuery {
    const [{ db, table }] = ast.table!;

    let id = 0;
    const createForeignKeyName = () => `${table}_ibfk_${++id}`;

    const columns: CreateColumn[] = [];
    const constraints: CreateConstraint[] = [];
    for (const c of ast.create_definitions as CreateDefinition[]) {
      if (c.resource === 'column') {
        columns.push({
          name: c.column.column,
          dataType: c.definition.dataType,
          defaultValue: c.default_val?.value ? buildExpression(c.default_val.value) : null,
          nullable: c.nullable?.value !== 'not null',
          unsigned: c.definition.suffix ? c.definition.suffix.includes('UNSIGNED') : null,
          length: c.definition.length ? c.definition.length : null,
          enumValues: c.definition.dataType === 'ENUM' ? buildExpression(c.definition.expr) : null,
          autoIncrement: c.auto_increment ? true : null,
          onUpdateCurrentTimestamp:
            c.default_val?.value?.over?.type === 'on update' ||
            c.reference_definition?.on_action[0]?.type === 'on update'
              ? true
              : null,
        });
      } else if (c.resource === 'constraint') {
        constraints.push(buildConstraint(c, createForeignKeyName));
      }
    }

    return new CreateTableQuery(
      db,
      table,
      columns,
      constraints,
      (ast.if_not_exists || '').toLocaleLowerCase() === 'if not exists',
    );
  }
}
