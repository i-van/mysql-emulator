import {
  Column,
  Database,
  DateColumn,
  DecimalColumn,
  EnumColumn,
  FloatColumn,
  IntegerColumn,
  Server,
  StringColumn,
  Table,
} from '../server';
import { CreateColumn, CreateTableQuery, ForeignKeyConstraint } from '../parser';
import { Evaluator } from './evaluator';
import { UniqueKey } from '../server/unique-key';
import { ProcessorException } from './processor.exception';
import { ForeignKey } from '../server/foreign-key';

export class CreateTableProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: CreateTableQuery): void {
    const db = this.server.getDatabase(query.database);
    try {
      const table = db.createTable(query.table);

      for (const column of query.columns) {
        table.addColumn(this.buildColumn(column));
      }
      for (const constraint of query.constraints) {
        if (constraint.type === 'primary_key' || constraint.type === 'unique_key') {
          const name = `${query.table}.${constraint.name}`;
          table.addUniqueKey(new UniqueKey(name, constraint.columns));
        } else if (constraint.type === 'foreign_key') {
          table.addForeignKey(this.buildForeignKey(db, table, constraint));
        }
      }
    } catch (err: any) {
      if (err.code === 'TABLE_EXISTS' && query.ifNotExists) {
        return;
      }
      db.dropTable(query.table, true);
      throw err;
    }
  }

  private buildForeignKey(db: Database, table: Table, fk: ForeignKeyConstraint): ForeignKey {
    let referencedTable: Table;
    try {
      referencedTable = db.getTable(fk.reference.table);
    } catch (err: any) {
      if (err.code === 'TABLE_DOES_NOT_EXIST') {
        throw new ProcessorException(`Failed to open the referenced table '${fk.reference.table}'`);
      }
      throw err;
    }

    if (fk.columns.length !== fk.reference.columns.length) {
      throw new ProcessorException(`Incorrect foreign key definition for '${fk.name}': Key reference and table reference don't match`);
    }
    const referencingTableColumns = new Map<string, Column>(
      table.getColumns().map((c) => [c.getName(), c]),
    );
    const referencedTableColumns = new Map<string, Column>(
      referencedTable.getColumns().map((c) => [c.getName(), c]),
    );
    for (let i = 0; i < fk.columns.length; i++) {
      const referencingColumn = referencingTableColumns.get(fk.columns[i].column);
      if (!referencingColumn) {
        throw new ProcessorException(`Key column '${fk.columns[i].column}' doesn't exist in table`);
      }
      const referencedColumn = referencedTableColumns.get(fk.reference.columns[i].column);
      if (!referencedColumn) {
        throw new ProcessorException(
          `Failed to add the foreign key constraint. ` +
          `Missing column '${fk.reference.columns[i].column}' for constraint '${fk.name}' in the referenced table '${fk.reference.table}'`,
        );
      }
      if (!referencingColumn.compareTo(referencedColumn)) {
        throw new ProcessorException(
          `Referencing column '${referencingColumn.getName()}' and referenced column '${referencedColumn.getName()}' ` +
          `in foreign key constraint '${fk.name}' are incompatible.`,
        );
      }
    }

    return new ForeignKey(fk.name, fk.columns, referencedTable, fk.reference.columns);
  }

  private buildColumn(c: CreateColumn): Column {
    if (c.defaultValue) {
      const defaultValue = this.evaluator.evaluateExpression(c.defaultValue, {});
      if (defaultValue === null && !c.nullable) {
        throw new ProcessorException(`Invalid default value for '${c.name}'`);
      }
    }

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
        return new DateColumn(c.name, c.nullable, c.defaultValue, Boolean(c.onUpdateCurrentTimestamp));
      case 'ENUM':
        if (c.defaultValue) {
          const defaultValue = this.evaluator.evaluateExpression(c.defaultValue, {});
          const included = this.evaluator.evaluateExpression(
            {
              type: 'binary_expression',
              operator: 'IN',
              left: c.defaultValue,
              right: c.enumValues!,
            },
            {},
          );
          if (!included && defaultValue !== null) {
            throw new ProcessorException(`Invalid default value for '${c.name}'`);
          }
        }
        return new EnumColumn(c.name, c.nullable, c.defaultValue, c.enumValues!);
    }
    throw new ProcessorException(`Unknown ${c.dataType} column data type`);
  }
}
