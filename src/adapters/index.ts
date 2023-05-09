import { DataSource, DataSourceOptions } from 'typeorm';
import { Options as SequelizeOptions, Sequelize } from 'sequelize';
import { QueryRunner } from '../query-runner';
import { Server } from '../server';
import { MysqlEmulatorDriver } from './mysql-emulator.driver';

const createDriver = () => {
  const server = new Server();
  const qr = new QueryRunner(server);
  return new MysqlEmulatorDriver(qr);
}

export const createTypeormDataSource = (options: DataSourceOptions): DataSource => {
  if (options.type !== 'mysql') {
    throw new Error(`Only mysql supported, got ${options.type}`);
  }

  return new DataSource({
    driver: createDriver(),
    ...options,
  });
};

export const createSequelize = (options: SequelizeOptions): Sequelize => {
  if (options.dialect !== 'mysql') {
    throw new Error(`Only mysql supported, got ${options.dialect}`);
  }

  return new Sequelize({
    dialectModule: createDriver(),
    ...options,
  });
};
