const { Sequelize } = require('sequelize');

const env = require('./env');

const sequelize = new Sequelize(
  env.db.database,
  env.db.username,
  env.db.password,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: 'postgres',
    // Sets the session time zone, so date_trunc('month', ...) in
    // v_monthly_bookings counts local months.
    timezone: env.timeZone,
    logging: false,
    // schema.sql owns the tables; models only map them and never sync().
    define: { underscored: true, timestamps: false },
  },
);

module.exports = sequelize;
