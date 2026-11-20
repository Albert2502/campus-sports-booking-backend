const AppError = require('../errors/app-error');
const rulesRepository = require('../repositories/rules.repository');
const usersRepository = require('../repositories/users.repository');
const { monthlyLimitFor } = require('./rules.service');

/**
 * The `UserProfile` shape from openapi.yaml, with this month's bookings and
 * the limit from booking_rules.
 * @param {import('sequelize').Model} user
 * @return {Promise<Object>}
 */
async function profileOf(user) {
  const [rules, bookingsThisMonth] = await Promise.all([
    rulesRepository.getRules(),
    usersRepository.countBookingsThisMonth(user.id),
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

module.exports = {
  profileOf,
  getProfile,
};
