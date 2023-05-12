import { Server } from '../server';
import { QueryRunner } from '../query-runner';
import { MysqlEmulatorDriver } from './mysql-emulator.driver';

export const createDriver = (): MysqlEmulatorDriver => {
  const server = new Server();
  const qr = new QueryRunner(server);
  return new MysqlEmulatorDriver(qr);
};
