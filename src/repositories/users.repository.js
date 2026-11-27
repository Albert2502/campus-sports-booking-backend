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

/**
 * Sets a new hash only if the current one is still `oldHash`.
 * @param {number} userId
 * @param {string} oldHash
 * @param {string} newHash
 * @return {Promise<boolean>} whether the row changed
 */
async function replacePasswordHash(userId, oldHash, newHash) {
  const [count] = await User.update(
    { passwordHash: newHash },
    { where: { id: userId, passwordHash: oldHash } },
  );
  return count === 1;
}

/**
 * WHERE clause and replacements for the admin list filters.
 * @param {{role: (string|undefined), status: (string|undefined),
 *     q: (string|undefined)}} filter
 * @return {{sql: string, replacements: Object}}
 */
function listFilter({ role, status, q }) {
  const conditions = ['TRUE'];
  const replacements = {};
  if (role) {
    conditions.push('u.role = :role');
    replacements.role = role;
  }
  if (status) {
    conditions.push('u.status = :status');
    replacements.status = status;
  }
  if (q) {
    // The search text is literal: % and _ in it match only themselves.
    conditions.push(`(u.full_name ILIKE :pattern ESCAPE '\\'
      OR u.email ILIKE :pattern ESCAPE '\\')`);
    replacements.pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  }
  return { sql: conditions.join(' AND '), replacements };
}

/**
 * One page of users sorted by name, with the figures of `UserProfile` in the
 * same query (no query per user).
 * @param {Object} filter role, status, q
 * @param {{page: number, pageSize: number}} page
 * @return {Promise<{rows: Array<Object>, total: number}>}
 */
async function listPage(filter, { page, pageSize }) {
  const { sql, replacements } = listFilter(filter);
  const [{ total }] = await sequelize.query(
    `SELECT count(*)::int AS total FROM users u WHERE ${sql}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const rows = await sequelize.query(
    `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.status,
            u.blocked_until AS "blockedUntil", u.created_at AS "createdAt",
            (SELECT coalesce(sum(m.bookings_count), 0)::int
             FROM v_monthly_bookings m
             WHERE m.user_id = u.id
               AND m.month = date_trunc('month', now())) AS "bookingsThisMonth",
            (SELECT count(*)::int FROM incidents i
             WHERE i.user_id = u.id AND i.type = 'no_show') AS "noShowCount"
     FROM users u
     WHERE ${sql}
     ORDER BY u.full_name, u.id
     LIMIT :limit OFFSET :offset`,
    {
      replacements: {
        ...replacements,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
      type: QueryTypes.SELECT,
    },
  );
  return { rows, total };
}

module.exports = {
  listPage,
  findByEmail,
  updatePasswordHash,
  replacePasswordHash,
  findById,
  countBookingsThisMonth,
  countNoShows,
};
