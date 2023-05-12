import { Options as SequelizeOptions, Sequelize } from 'sequelize';
import { createDriver } from './driver';

export const createSequelize = (options: SequelizeOptions): Sequelize => {
  if (options.dialect !== 'mysql') {
    throw new Error(`Only mysql supported, got ${options.dialect}`);
  }

  return new Sequelize({
    dialectModule: createDriver(),
    ...options,
  });
};
