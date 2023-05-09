import { Sequelize, Model, DataTypes } from 'sequelize';
import { createSequelize } from '../../src/adapters';

async function sequelizeBasicExample() {
  const sequelize = await createSequelize({
    dialect: 'mysql',
    // dialectModule: undefined,
    // host: 'localhost',
    // port: 3306,
    // username: 'root',
    // password: 'password',
    // database: 'mysql_emulator',
  });
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
  });

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    // insert
    const jane = await User.create({ firstName: 'Jane', lastName: 'Doe' });
    const john = await User.create({ firstName: 'John', lastName: 'Doe' });
    console.log('Jane', jane.toJSON());
    console.log('John', john.toJSON());

    // update
    john.set('lastName', 'Smith');
    await john.save();

    // delete
    await john.destroy();

    // select
    const users = await User.findAll();
    console.log(users.map(u => u.toJSON()));
  } finally {
    await sequelize.close();
  }
}

sequelizeBasicExample().then(console.log, console.log);
