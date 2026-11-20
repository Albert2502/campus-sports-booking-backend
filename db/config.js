// Connection used by sequelize-cli (db:create, db:migrate, db:seed).
const env = require('../src/config/env');

const config = {
  ...env.db,
  dialect: 'postgres',
  timezone: env.timeZone,
  logging: false,
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
