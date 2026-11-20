// Creates the test database once, if it does not exist yet.
require('./test-env');
const { Client } = require('pg');

module.exports = async function globalSetup() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME],
    );
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
    }
  } finally {
    await client.end();
  }
};
