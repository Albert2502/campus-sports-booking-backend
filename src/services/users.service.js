const bcrypt = require('bcrypt');

const AppError = require('../errors/app-error');
const rulesRepository = require('../repositories/rules.repository');
const usersRepository = require('../repositories/users.repository');
const { monthlyLimitFor } = require('./rules.service');

/**
 * The `UserProfile` shape from openapi.yaml, with this month's bookings, the
 * limit from booking_rules and the no-show count shown on the profile.
 * @param {import('sequelize').Model} user
 * @return {Promise<Object>}
 */
async function profileOf(user) {
  const [rules, bookingsThisMonth, noShowCount] = await Promise.all([
    rulesRepository.getRules(),
    usersRepository.countBookingsThisMonth(user.id),
    usersRepository.countNoShows(user.id),
  ]);
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    blockedUntil: user.blockedUntil,
    createdAt: user.createdAt,
    bookingsThisMonth,
    monthlyLimit: monthlyLimitFor(user.role, rules),
    noShowCount,
  };
}

/**
 * GET /users (admin): a page of `UserProfile`s, sorted by name.
 * @param {{role: (string|undefined), status: (string|undefined),
 *     q: (string|undefined), page: number, pageSize: number}} query
 * @return {Promise<{items: Array<Object>, meta: Object}>}
 */
async function listUsers({ role, status, q, page, pageSize }) {
  const [rules, { rows, total }] = await Promise.all([
    rulesRepository.getRules(),
    usersRepository.listPage({ role, status, q }, { page, pageSize }),
  ]);
  return {
    items: rows.map((row) => ({
      ...row,
      monthlyLimit: monthlyLimitFor(row.role, rules),
    })),
    meta: { page, pageSize, total },
  };
}

/**
 * The profile of a signed-in user.
 * @param {number} userId
 * @return {Promise<Object>}
 */
async function getProfile(userId) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    // The token is valid but the account is gone (e.g. after db:reset).
    throw new AppError(401, 'UNAUTHORIZED', 'Contul nu mai există.');
  }
  return profileOf(user);
}

const BCRYPT_ROUNDS = 10;

/**
 * @param {string} password
 * @return {Promise<string>} the bcrypt hash stored in users.password_hash
 */
function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Sets a new password after checking the current one.
 * @param {number} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @return {Promise<void>}
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Contul nu mai există.');
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(
      422,
      'WRONG_PASSWORD',
      'Parola curentă nu este corectă.',
    );
  }
  await usersRepository.updatePasswordHash(
    userId,
    await hashPassword(newPassword),
  );
}

module.exports = {
  listUsers,
  profileOf,
  getProfile,
  hashPassword,
  changePassword,
};
