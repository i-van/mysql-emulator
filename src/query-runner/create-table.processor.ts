import {
  Column,
  DateColumn,
  DecimalColumn,
  EnumColumn,
  FloatColumn,
  IntegerColumn,
  Server,
  StringColumn,
  Table,
} from '../server';
import { CreateColumn, CreateTableQuery } from '../parser';
import { Evaluator } from './evaluator';
import { UniqueConstraint } from '../server/unique-constraint';
import { ProcessorException } from './processor.exception';

export class CreateTableProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: CreateTableQuery): void {
    const db = this.server.getDatabase(query.database);
    let table: Table;
    try {
      table = db.createTable(query.table);
    } catch (err: any) {
      if (err.code === 'TABLE_EXISTS' && query.ifNotExists) {
        return;
      }
      throw err;
    }

    for (const column of query.columns) {
      table.addColumn(this.buildColumn(column));
    }
    for (const constraint of query.constraints) {
      const name = `${query.table}.${constraint.name}`;
      table.addConstraint(new UniqueConstraint(name, constraint.columns));
    }
  }

  private buildColumn(c: CreateColumn): Column {
    switch (c.dataType) {
      case 'TINYINT':
        return new IntegerColumn(c.name, c.nullable, c.defaultValue, c.unsigned!, c.autoIncrement!, 8);
      case 'SMALLINT':
        return new IntegerColumn(c.name, c.nullable, c.defaultValue, c.unsigned!, c.autoIncrement!, 16);
      case 'MEDIUMINT':
        return new IntegerColumn(c.name, c.nullable, c.defaultValue, c.unsigned!, c.autoIncrement!, 24);
      case 'INT':
      case 'INTEGER':
        return new IntegerColumn(c.name, c.nullable, c.defaultValue, c.unsigned!, c.autoIncrement!, 32);
      case 'BIGINT':
        return new IntegerColumn(c.name, c.nullable, c.defaultValue, c.unsigned!, c.autoIncrement!, 64);
      case 'DECIMAL':
        return new DecimalColumn(c.name, c.nullable, c.defaultValue, c.unsigned!);
      case 'FLOAT':
      case 'DOUBLE':
        return new FloatColumn(c.name, c.nullable, c.defaultValue, c.unsigned!);
      case 'CHAR':
      case 'VARCHAR':
        return new StringColumn(c.name, c.nullable, c.defaultValue, c.length!);
      case 'TINYTEXT':
      case 'TEXT':
      case 'MEDIUMTEXT':
      case 'LONGTEXT':
        return new StringColumn(c.name, c.nullable, c.defaultValue, Number.MAX_VALUE);
      case 'BINARY':
      case 'VARBINARY':
        return new StringColumn(c.name, c.nullable, c.defaultValue, c.length!);
      case 'TINYBLOB':
      case 'BLOB':
      case 'MEDIUMBLOB':
      case 'LONGBLOB':
        return new StringColumn(c.name, c.nullable, c.defaultValue, Number.MAX_VALUE);
      case 'TIMESTAMP':
      case 'DATETIME':
      case 'DATE':
      case 'TIME':
      case 'YEAR':
        return new DateColumn(c.name, c.nullable, c.defaultValue);
      case 'ENUM':
        if (c.defaultValue) {
          const included = this.evaluator.evaluateExpression({
            type: 'binary_expression',
            operator: 'IN',
            left: c.defaultValue,
            right: c.enumValues!,
          }, {});
          if (!included) {
            throw new ProcessorException(`Invalid default value for '${c.name}'`);
          }
        }
        return new EnumColumn(c.name, c.nullable, c.defaultValue, c.enumValues!);
    }
    throw new ProcessorException(`Unknown ${c.dataType} column data type`);
  }
}
