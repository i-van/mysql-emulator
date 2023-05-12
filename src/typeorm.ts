import { DataSource, DataSourceOptions } from 'typeorm';
import { QueryRunner } from './query-runner';
import { Server } from './server';
import { MysqlEmulatorDriver } from './driver';

export const createTypeormDataSource = (options: DataSourceOptions): DataSource => {
  if (options.type !== 'mysql') {
    throw new Error(`Only mysql supported, got ${options.type}`);
  }

  const server = new Server();
  const qr = new QueryRunner(server);
  const driver = new MysqlEmulatorDriver(qr);

  return new DataSource({ driver, ...options });
};
