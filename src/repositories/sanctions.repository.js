const { Op, QueryTypes, fn } = require('sequelize');

const { sequelize, Sanction, User } = require('../models');

// Not lifted and not ended: it still blocks the account.
const ACTIVE = {
  liftedAt: null,
  [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gt]: fn('now') } }],
};

/**
 * Runs `work` in one transaction with the user's row locked, so two admins
 * acting on the same account at once cannot both pass the checks.
 * @param {number} userId
 * @param {function(?import('sequelize').Model,
 *     import('sequelize').Transaction): Promise<*>} work gets null when the
 *     user does not exist
 * @return {Promise<*>} what `work` returns
 */
function withLockedUser(userId, work) {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    return work(user, transaction);
  });
}

/**
 * @param {number} userId
 * @param {import('sequelize').Transaction} transaction
 * @return {Promise<number>}
 */
function countActive(userId, transaction) {
  return Sanction.count({ where: { userId, ...ACTIVE }, transaction });
}

/**
 * Now plus `months` months, computed by PostgreSQL (31 August + 6 months is
 * 28 or 29 February, not early March).
 * @param {number} months
 * @param {import('sequelize').Transaction} transaction
 * @return {Promise<Date>}
 */
async function monthsFromNow(months, transaction) {
  const [row] = await sequelize.query(
    'SELECT now() + make_interval(months => :months) AS at',
    { replacements: { months }, type: QueryTypes.SELECT, transaction },
  );
  return row.at;
}

/**
 * Inserts the sanction and blocks the account until its end.
 * @param {{userId: number, reason: string, endsAt: Date,
 *     fineAmount: number}} fields
 * @param {import('sequelize').Transaction} transaction
 * @return {Promise<import('sequelize').Model>}
 */
async function createAndBlock(fields, transaction) {
  const sanction = await Sanction.create(
    { ...fields, startsAt: new Date() },
    { transaction },
  );
  await User.update(
    { status: 'blocked', blockedUntil: fields.endsAt },
    { where: { id: fields.userId }, transaction },
  );
  return sanction;
}

module.exports = {
  withLockedUser,
  countActive,
  monthsFromNow,
  createAndBlock,
};
