import { Column, IntegerColumn, Server } from '../server';
import { ColumnRef, ReplaceQuery } from '../parser';
import { Evaluator } from './evaluator';
import { ProcessorException } from './processor.exception';
import { castValue, createColumnDefinitionGetter } from './helpers';

export class ReplaceProcessor {
  protected evaluator = new Evaluator(this.server);

  constructor(protected server: Server) {}

  process(query: ReplaceQuery) {
    const table = this.server.getDatabase(query.database).getTable(query.table);
    const keyMapper = (key: string) => `${query.table}::${key}`;
    const columnDefinitions = table.getColumns();
    const columns = query.columns || columnDefinitions.map((c) => c.getName());
    const getColumnDefinition = createColumnDefinitionGetter(columnDefinitions);
    const areEqualRows = (r1: object, r2: object): boolean =>
      columnDefinitions.every((c: Column) => {
        const v1 = r1[c.getName()] ?? null;
        const v2 = r2[c.getName()] ?? null;
        return v1 === v2;
      });

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
        if (err.code !== 'DUPLICATE_ENTRY' || !rowId) {
          throw err;
        }
        const existingRow = table.getRow(rowId);
        if (!areEqualRows(existingRow, row)) {
          affectedRows++;
          table.deleteRow(rowId);
          table.insertRow(row);
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
