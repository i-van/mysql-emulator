import { DataSource, DataSourceOptions } from 'typeorm';
import { createDriver } from './driver';

export const createTypeormDataSource = (options: DataSourceOptions): DataSource => {
  if (options.type !== 'mysql') {
    throw new Error(`Only mysql supported, got ${options.type}`);
  }

  return new DataSource({
    driver: createDriver(),
    ...options,
  });
};
