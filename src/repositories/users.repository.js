const { fn, col, where } = require('sequelize');

const { User } = require('../models');

/**
 * @param {string} email compared without regard to case
 * @return {Promise<?import('sequelize').Model>}
 */
function findByEmail(email) {
  return User.findOne({
    where: where(fn('lower', col('email')), email.toLowerCase()),
  });
}

module.exports = {
  findByEmail,
};
