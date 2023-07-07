import { Column, DateColumn } from '../server';
import { ProcessorException } from './processor.exception';
import { Assignment } from '../parser';

export const createColumnDefinitionGetter = (columns: Column[]) => {
  const map = new Map<string, Column>(columns.map((c) => [c.getName(), c]));
  return (column: string): Column => {
    const c = map.get(column);
    if (!c) {
      throw new ProcessorException(`Unknown column '${column}' in 'field list'`);
    }
    return c;
  };
};

export const createCurrentTimestampApplier = (columns: Column[], assignments: Assignment[]) => {
  const set = new Set<string>(assignments.map((a) => a.column));
  return (row: object) => {
    return columns.reduce((row, c) => {
      const hasOnUpdate = c instanceof DateColumn && c.hasOnUpdateCurrentTimestamp();
      const updated = set.has(c.getName());
      return hasOnUpdate && !updated ? { ...row, [c.getName()]: new Date() } : row;
    }, row);
  };
};

export const castValue = (c: Column, value: unknown, index: number) => {
  try {
    return c.cast(value);
  } catch (err: any) {
    if (['OUT_OF_RANGE_VALUE', 'INCORRECT_INTEGER_VALUE'].includes(err.code)) {
      throw new ProcessorException(`${err.message} at row ${index}`);
    }
    throw err;
  }
};
