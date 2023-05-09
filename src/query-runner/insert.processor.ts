import { Column, IntColumn, Server } from '../server';
import { ColumnRef, InsertQuery } from '../parser';
import { Evaluator } from './evaluator';

export class InsertProcessor {
  constructor(protected server: Server) {}

  process(query: InsertQuery) {
    const db = this.server.getDatabase(query.database);
    const table = db.getTable(query.table);
    const columnDefinitions = table.getColumns();
    const columnDefinitionMap = new Map<string, Column>(
      columnDefinitions.map((c) => [c.getName(), c])
    );
    const evaluator = new Evaluator(
      this.server,
      columnDefinitions.map(c => `${query.table}::${c.getName()}`),
    );
    const columns = query.columns || columnDefinitions.map(c => c.getName());
    const getColumnDefinition = (column: string): Column => {
      const c = columnDefinitionMap.get(column);
      if (!c) {
        throw new Error(`Unknown column '${column}' in 'field list'`);
      }
      return c;
    };
    const evaluateDefaultValue = (column: Column, row: Object): any | null => {
      if (column instanceof IntColumn && column.hasAutoIncrement()) {
        return column.getNextAutoIncrementValue();
      }
      const defaultValue = column.getDefaultValueExpression();
      if (defaultValue) {
        return evaluator.evaluateExpression(defaultValue, row);
      }
      return null;
    };

    let insertId = 0;
    let affectedRows = 0;
    query.values.forEach((values, rowIndex) => {
      if (values.length !== columns.length) {
        throw new Error(`Column count doesn't match value count at row ${rowIndex + 1}`);
      }
      const rawRow = values.reduce((res, expression, valueIndex) => ({
        ...res,
        [`${query.table}::${columns[valueIndex]}`]: expression.type === 'default'
          ? evaluateDefaultValue(getColumnDefinition(columns[valueIndex]), res)
          : evaluator.evaluateExpression(expression, res),
      }), {});
      const row = columnDefinitions.reduce((res, c) => {
        const columnRef: ColumnRef = {
          type: 'column_ref',
          table: query.table,
          column: c.getName(),
        };
        const value = evaluator.evaluateExpression(columnRef, rawRow) || evaluateDefaultValue(c, rawRow);
        if (value === null && !c.isNullable()) {
          throw new Error(`Field '${c.getName()}' doesn't have a default value`);
        }
        return {
          ...res,
          [c.getName()]: value,
        }
      }, {});
      table.insertRow(row);
      affectedRows++;
      // todo: find primary id
      insertId = row['id'];
    });

    return { affectedRows, insertId };
  }
}
