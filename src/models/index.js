const sequelize = require('../config/database');
const defineBookingRule = require('./booking-rule');
const defineUser = require('./user');

const BookingRule = defineBookingRule(sequelize);
const User = defineUser(sequelize);

module.exports = {
  sequelize,
  BookingRule,
  User,
};
