import { Column, DatetimeColumn, IntColumn, Server, VarcharColumn } from '../server';
import { CreateColumn, CreateTableQuery } from '../parser';

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
    }
    throw new Error(`Unknown ${c.dataType} column data type`);
  }
}
