const AppError = require('../errors/app-error');
const rulesRepository = require('../repositories/rules.repository');
const usersRepository = require('../repositories/users.repository');
const { toUserSummary } = require('./mappers');
const { monthlyLimitFor } = require('./rules.service');

/**
 * The `UserProfile` of a user, with this month's booking count and limit.
 * @param {number} userId
 * @return {Promise<Object>}
 */
async function getProfile(userId) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Contul nu mai există.');
  }
  const [rules, bookingsThisMonth] = await Promise.all([
    rulesRepository.getRules(),
    usersRepository.countBookingsInMonth(userId, new Date()),
  ]);
  return {
    ...toUserSummary(user),
    status: user.status,
    blockedUntil: user.blocked_until,
    createdAt: user.created_at,
    bookingsThisMonth,
    monthlyLimit: monthlyLimitFor(user.role, rules),
  };
}

module.exports = {
  getProfile,
};
