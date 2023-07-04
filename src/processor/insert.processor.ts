import { Column, DateColumn, IntegerColumn, Server } from '../server';
import { ColumnRef, InsertQuery } from '../parser';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { extractColumn, mapKeys } from '../utils';

export class InsertProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: InsertQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.table}::${key}`;
    const columnDefinitions = table.getColumns();
    const columnDefinitionMap = new Map<string, Column>(columnDefinitions.map((c) => [c.getName(), c]));
    const columns = query.columns || columnDefinitions.map((c) => c.getName());
    const getColumnDefinition = (column: string): Column => {
      const c = columnDefinitionMap.get(column);
      if (!c) {
        throw new ProcessorException(`Unknown column '${column}' in 'field list'`);
      }
      return c;
    };
    const evaluateDefaultValue = (column: Column, row: object): any | null => {
      if (column instanceof IntegerColumn && column.hasAutoIncrement()) {
        return column.getAutoIncrementCursor() + 1;
      }
      const defaultValue = column.getDefaultValueExpression();
      if (defaultValue) {
        return this.evaluator.evaluateExpression(defaultValue, row);
      }
      return null;
    };
    const castValue = (c: Column, value: unknown, index: number) => {
      try {
        return c.cast(value);
      } catch (err: any) {
        if (['OUT_OF_RANGE_VALUE', 'INCORRECT_INTEGER_VALUE'].includes(err.code)) {
          throw new ProcessorException(`${err.message} at row ${index}`);
        }
        throw err;
      }
    };
    const updatingColumns = new Set<string>(query.onDuplicateUpdate.map((a) => a.column));
    const applyCurrentTimestamp = (row: object) =>
      columnDefinitions.reduce((row, c) => {
        const hasOnUpdate = c instanceof DateColumn && c.hasOnUpdateCurrentTimestamp();
        const updated = updatingColumns.has(c.getName());
        return hasOnUpdate && !updated ? { ...row, [c.getName()]: new Date() } : row;
      }, row);

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
              ? evaluateDefaultValue(column, res)
              : this.evaluator.evaluateExpression(expression, res),
        };
      }, placeholder);
      const row = columnDefinitions.reduce((res, c) => {
        const columnRef: ColumnRef = {
          type: 'column_ref',
          table: query.table,
          column: c.getName(),
        };
        const value = this.evaluator.evaluateExpression(columnRef, rawRow) ?? evaluateDefaultValue(c, rawRow);
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
        table.insertRow(row);
        affectedRows++;
      } catch (err: any) {
        const rowId = err.data?.rowId;
        if (!query.onDuplicateUpdate.length || err.code !== 'DUPLICATE_ENTRY' || !rowId) {
          throw err;
        }
        affectedRows++;
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
}
