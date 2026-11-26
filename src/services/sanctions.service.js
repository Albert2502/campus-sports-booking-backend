const AppError = require('../errors/app-error');
const rulesRepository = require('../repositories/rules.repository');
const sanctionsRepository = require('../repositories/sanctions.repository');
const usersRepository = require('../repositories/users.repository');

/**
 * The `Sanction` shape from openapi.yaml.
 * @param {import('sequelize').Model} sanction
 * @return {Object}
 */
function toSanction(sanction) {
  return {
    id: sanction.id,
    userId: sanction.userId,
    reason: sanction.reason,
    startsAt: sanction.startsAt,
    endsAt: sanction.endsAt,
    // NUMERIC comes back from pg as a string.
    fineAmount:
      sanction.fineAmount === null ? null : Number(sanction.fineAmount),
    active:
      sanction.liftedAt === null &&
      (sanction.endsAt === null || sanction.endsAt > new Date()),
    liftedAt: sanction.liftedAt,
    liftedBy: sanction.liftedBy,
    liftMethod: sanction.liftMethod,
  };
}

/**
 * POST /users/{userId}/sanctions (admin): blocks the account (DESIGN §5, 8).
 * @param {number} userId
 * @param {{reason: string, endsAt: (Date|undefined),
 *     fineAmount: (number|undefined)}} input
 * @return {Promise<Object>} the `Sanction`
 */
async function blockUser(userId, input) {
  const rules = await rulesRepository.getRules();
  const sanction = await sanctionsRepository.withLockedUser(
    userId,
    async (user, transaction) => {
      if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Utilizatorul nu există.');
      }
      if (user.role === 'admin') {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Contul unui administrator nu poate fi blocat.',
        );
      }
      if ((await sanctionsRepository.countActive(userId, transaction)) > 0) {
        throw new AppError(
          409,
          'ALREADY_BLOCKED',
          'Contul este deja blocat. Deblochează-l înainte de o nouă blocare.',
        );
      }
      return sanctionsRepository.createAndBlock(
        {
          userId,
          reason: input.reason,
          endsAt:
            input.endsAt ??
            (await sanctionsRepository.monthsFromNow(
              rules.banMonths,
              transaction,
            )),
          fineAmount: input.fineAmount ?? Number(rules.unbanFineAmount),
        },
        transaction,
      );
    },
  );
  return toSanction(sanction);
}

/**
 * PATCH /sanctions/{sanctionId} (admin): lifts a sanction that is not lifted
 * yet, even one already past its end, so an account never stays blocked by
 * an expired sanction nobody can touch (DESIGN §5, 8).
 * @param {number} sanctionId
 * @param {number} adminId
 * @return {Promise<Object>} the `Sanction`
 */
async function liftSanction(sanctionId, adminId) {
  const found = await sanctionsRepository.findById(sanctionId);
  if (!found) {
    throw new AppError(404, 'NOT_FOUND', 'Sancțiunea nu există.');
  }
  // The user row is locked first, as when blocking, then the sanction is
  // read again inside the transaction.
  const sanction = await sanctionsRepository.withLockedUser(
    found.userId,
    async (user, transaction) => {
      const current = await sanctionsRepository.findById(
        sanctionId,
        transaction,
      );
      if (current.liftedAt !== null) {
        throw new AppError(
          409,
          'ALREADY_LIFTED',
          'Sancțiunea a fost deja ridicată.',
        );
      }
      return sanctionsRepository.liftAndUpdateAccount(
        current,
        adminId,
        transaction,
      );
    },
  );
  return toSanction(sanction);
}

/**
 * GET /users/{userId}/sanctions (admin): the active one first, then the
 * rest from the newest.
 * @param {number} userId
 * @return {Promise<Array<Object>>}
 */
async function listUserSanctions(userId) {
  if (!(await usersRepository.findById(userId))) {
    throw new AppError(404, 'NOT_FOUND', 'Utilizatorul nu există.');
  }
  const sanctions = (await sanctionsRepository.listForUser(userId)).map(
    toSanction,
  );
  // A stable sort keeps the newest-first order inside each group.
  return sanctions.sort((a, b) => Number(b.active) - Number(a.active));
}

module.exports = {
  blockUser,
  liftSanction,
  listUserSanctions,
};
