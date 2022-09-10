require('dotenv').config();
const mysql = require('mysql2/promise');

let connection;

require('../src').query = async (sql, params = []) => {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  }

  const [rows, fields] = await connection.query(sql, params);
  return rows;
};
