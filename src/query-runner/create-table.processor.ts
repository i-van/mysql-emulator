import { Column, DatetimeColumn, EnumColumn, IntColumn, Server, VarcharColumn } from '../server';
import { CreateColumn, CreateTableQuery, Expression } from '../parser';
import { Evaluator } from './evaluator';

export class CreateTableProcessor {
  constructor(protected server: Server) {}

  process(query: CreateTableQuery): void {
    const db = this.server.getDatabase(query.database);
    const table = db.createTable(query.table);

    for (const column of query.columns) {
      table.addColumn(this.buildColumn(column));
    }
  }

  private buildColumn(c: CreateColumn): Column {
    switch (c.dataType) {
      case 'INT':
      case 'INTEGER':
        return new IntColumn(c.name, c.nullable, c.defaultValue, c.unsigned!, c.autoIncrement!);
      case 'VARCHAR':
        return new VarcharColumn(c.name, c.nullable, c.defaultValue, c.length!);
      case 'DATETIME':
        return new DatetimeColumn(c.name, c.nullable, c.defaultValue);
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
