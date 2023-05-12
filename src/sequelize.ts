import { Options as SequelizeOptions, Sequelize } from 'sequelize';
import { QueryRunner } from './query-runner';
import { Server } from './server';
import { MysqlEmulatorDriver } from './driver';

export const createSequelize = (options: SequelizeOptions): Sequelize => {
  if (options.dialect !== 'mysql') {
    throw new Error(`Only mysql supported, got ${options.dialect}`);
  }

  const server = new Server();
  const qr = new QueryRunner(server);
  const driver = new MysqlEmulatorDriver(qr);

  return new Sequelize({
    dialectModule: driver,
    ...options,
  });
};
