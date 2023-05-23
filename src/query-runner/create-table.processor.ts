import {
  Column,
  DateColumn,
  DecimalColumn,
  EnumColumn,
  FloatColumn,
  IntegerColumn,
  Server,
  StringColumn,
} from '../server';
import { CreateColumn, CreateTableQuery } from '../parser';
import { Evaluator } from './evaluator';
import { UniqueConstraint } from '../server/unique-constraint';

export class CreateTableProcessor {
  constructor(protected server: Server) {}

  process(query: CreateTableQuery): void {
    const db = this.server.getDatabase(query.database);
    const table = db.createTable(query.table);

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
          const evaluator = new Evaluator(this.server, []);
          const included = evaluator.evaluateExpression({
            type: 'binary_expression',
            operator: 'IN',
            left: c.defaultValue,
            right: c.enumValues!,
          }, {});
          if (!included) {
            throw new Error(`Invalid default value for '${c.name}'`);
          }
        }
        return new EnumColumn(c.name, c.nullable, c.defaultValue, c.enumValues!);
    }
    throw new Error(`Unknown ${c.dataType} column data type`);
  }
}
