import { DataSource } from 'typeorm';
import { QueryRunner } from '../query-runner';
import { Server } from '../server';
import { MysqlEmulatorDriver } from './mysql-emulator.driver';

export const createTypeormDataSource = (options: any): DataSource => {
  const server = new Server();
  const qr = new QueryRunner(server);
  const driver = new MysqlEmulatorDriver(qr);

  if (options?.type !== 'mysql' && options?.type !== 'mysql2') {
    throw new Error(`Only mysql supported, got ${options?.type}`);
  }

  return new DataSource({ driver, ...options });
};
