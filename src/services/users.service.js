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
