import { Column, IntegerColumn, Server } from '../server';
import { ColumnRef, InsertQuery } from '../parser';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { extractColumn, mapKeys } from '../utils';
import { castValue, createColumnDefinitionGetter, createCurrentTimestampApplier } from './helpers';

export class InsertProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: InsertQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.table}::${key}`;
    const columnDefinitions = table.getColumns();
    const columns = query.columns || columnDefinitions.map((c) => c.getName());
    const getColumnDefinition = createColumnDefinitionGetter(columnDefinitions);
    const applyCurrentTimestamp = createCurrentTimestampApplier(columnDefinitions, query.onDuplicateUpdate);

    let insertId = 0;
    let affectedRows = 0;
    const placeholder = columnDefinitions.reduce(
      (res, c) => ({
        ...res,
        [keyMapper(c.getName())]: null,
      }),
      {},
    );
    query.values.forEach((values, rowIndex) => {
      if (values.length !== columns.length) {
        throw new ProcessorException(`Column count doesn't match value count at row ${rowIndex + 1}`);
      }
      const rawRow = values.reduce((res, expression, valueIndex) => {
        const column = getColumnDefinition(columns[valueIndex]);
        return {
          ...res,
          [keyMapper(column.getName())]:
            expression.type === 'default'
              ? this.evaluateDefaultValue(column, res)
              : this.evaluator.evaluateExpression(expression, res),
        };
      }, placeholder);
      const row = columnDefinitions.reduce((res, c) => {
        const columnRef: ColumnRef = {
          type: 'column_ref',
          table: query.table,
          column: c.getName(),
        };
        const value = this.evaluator.evaluateExpression(columnRef, rawRow) ?? this.evaluateDefaultValue(c, rawRow);
        if (value === null && !c.isNullable()) {
          throw new ProcessorException(`Field '${c.getName()}' doesn't have a default value`);
        }
        if (c instanceof IntegerColumn && c.hasAutoIncrement()) {
          const cursor = c.getAutoIncrementCursor();
          if (value > cursor) {
            c.setAutoIncrementCursor(value);
          }
          insertId = value;
        }

        return {
          ...res,
          [c.getName()]: castValue(c, value, rowIndex + 1),
        };
      }, {});

      try {
        affectedRows++;
        table.insertRow(row);
      } catch (err: any) {
        const rowId = err.data?.rowId;
        if (!query.onDuplicateUpdate.length || err.code !== 'DUPLICATE_ENTRY' || !rowId) {
          throw err;
        }
        const existingRow = table.getRow(rowId);
        const existingRawRow = mapKeys(existingRow, keyMapper);
        // change table name to 'new' specifically for VALUES function
        const newRawRow = mapKeys(rawRow, (key) => `new::${extractColumn(key)}`);

        const updatedRow = query.onDuplicateUpdate.reduce((row, a) => {
          const column = getColumnDefinition(a.column);
          const rawValue = this.evaluator.evaluateExpression(a.value, {
            ...existingRawRow,
            ...newRawRow,
          });
          const nextValue = castValue(column, rawValue, rowIndex + 1);
          const currentValue = row[column.getName()];

          return nextValue !== currentValue ? { ...row, [column.getName()]: nextValue } : row;
        }, existingRow);

        if (existingRow === updatedRow) {
          insertId = 0;
        } else {
          affectedRows++;
          table.updateRow(rowId, applyCurrentTimestamp(updatedRow));
        }
      }
    });

    return { affectedRows, insertId };
  }

  private evaluateDefaultValue(column: Column, row: object): any | null {
    if (column instanceof IntegerColumn && column.hasAutoIncrement()) {
      return column.getAutoIncrementCursor() + 1;
    }
    const defaultValue = column.getDefaultValueExpression();
    if (defaultValue) {
      return this.evaluator.evaluateExpression(defaultValue, row);
    }
    return null;
  }
}
