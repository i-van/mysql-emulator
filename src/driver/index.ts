import { Server } from '../server';
import { Processor } from '../processor';
import { MysqlEmulatorDriver } from './mysql-emulator.driver';

export const createDriver = (): MysqlEmulatorDriver => {
  const server = new Server();
  const processor = new Processor(server);
  return new MysqlEmulatorDriver(processor);
};
