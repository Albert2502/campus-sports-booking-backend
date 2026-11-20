const { QueryTypes, fn, col, where } = require('sequelize');

const { sequelize, User } = require('../models');

/**
 * @param {string} email compared without regard to case
 * @return {Promise<?import('sequelize').Model>}
 */
function findByEmail(email) {
  return User.findOne({
    where: where(fn('lower', col('email')), email.toLowerCase()),
  });
}

/**
 * @param {number} id
 * @return {Promise<?import('sequelize').Model>}
 */
function findById(id) {
  return User.findByPk(id);
}

/**
 * The user's active bookings in the current month, from v_monthly_bookings.
 * "Current month" follows the session time zone (Europe/Bucharest).
 * @param {number} userId
 * @return {Promise<number>}
 */
async function countBookingsThisMonth(userId) {
  const [row] = await sequelize.query(
    `SELECT coalesce(sum(bookings_count), 0)::int AS total
     FROM v_monthly_bookings
     WHERE user_id = :userId AND month = date_trunc('month', now())`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
  return row.total;
}

/**
 * How many times the user did not show up, from the `no_show` incidents.
 * @param {number} userId
 * @return {Promise<number>}
 */
async function countNoShows(userId) {
  const [row] = await sequelize.query(
    `SELECT count(*)::int AS total
     FROM incidents
     WHERE user_id = :userId AND type = 'no_show'`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
  return row.total;
}

/**
 * @param {number} userId
 * @param {string} passwordHash
 * @return {Promise<void>}
 */
async function updatePasswordHash(userId, passwordHash) {
  await User.update({ passwordHash }, { where: { id: userId } });
}

module.exports = {
  findByEmail,
  updatePasswordHash,
  findById,
  countBookingsThisMonth,
  countNoShows,
};
