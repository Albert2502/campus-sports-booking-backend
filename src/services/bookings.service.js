const { withTransaction } = require('../config/db');
const AppError = require('../errors/app-error');
const bookingsRepository = require('../repositories/bookings.repository');
const rulesRepository = require('../repositories/rules.repository');
const slotsRepository = require('../repositories/slots.repository');
const usersRepository = require('../repositories/users.repository');
const { toBooking } = require('./mappers');
const { monthlyLimitFor } = require('./rules.service');

const UNIQUE_VIOLATION = '23505';

function slotTaken() {
  return new AppError(
    409,
    'SLOT_TAKEN',
    'Intervalul a fost ocupat între timp. Alege alt interval.',
  );
}

function slotNotFound() {
  return new AppError(404, 'NOT_FOUND', 'Intervalul nu există.');
}

/**
 * CreateBooking from the contract: checks, in one transaction, the account,
 * the monthly limit and the slot, then books it. Free slots are confirmed at
 * once; paid ones stay `pending` until payment (not part of this demo).
 * @param {number} slotId
 * @param {{id: number, role: string}} user
 * @return {Promise<Object>} the created `Booking`
 */
async function createBooking(slotId, user) {
  return withTransaction(async (client) => {
    const account = await usersRepository.findById(user.id, client);
    if (!account) {
      throw new AppError(401, 'UNAUTHORIZED', 'Contul nu mai există.');
    }
    if (account.status === 'blocked') {
      throw new AppError(
        403,
        'ACCOUNT_BLOCKED',
        'Contul tău este blocat și nu poate face rezervări.',
      );
    }

    const slot = await slotsRepository.findForBooking(slotId, client);
    if (!slot) {
      throw slotNotFound();
    }
    if (slot.facility_status === 'inactive' && account.role !== 'admin') {
      throw slotNotFound();
    }
    // Students must not learn that slots outside opening hours exist.
    if (account.role === 'student' && slot.outside_hours) {
      throw slotNotFound();
    }

    const rules = await rulesRepository.getRules(client);
    const limit = monthlyLimitFor(account.role, rules);
    if (limit !== null) {
      const used = await usersRepository.countBookingsInMonth(
        account.id,
        slot.starts_at,
        client,
      );
      if (used >= limit) {
        throw new AppError(
          422,
          'MONTHLY_LIMIT_REACHED',
          limit === 1
            ? 'Ai atins limita de o rezervare pe lună.'
            : `Ai atins limita de ${limit} rezervări pe lună.`,
          {
            auctionAvailable:
              slot.auction_closes_at !== null &&
              slot.auction_closes_at > new Date(),
          },
        );
      }
    }

    if (slot.in_past) {
      throw new AppError(422, 'SLOT_IN_PAST', 'Intervalul a început deja.');
    }
    if (slot.facility_status === 'maintenance' || slot.has_closure) {
      throw new AppError(
        422,
        'FACILITY_CLOSED',
        'Facilitatea este închisă în acest interval.',
      );
    }
    if (slot.has_active_booking) {
      throw slotTaken();
    }

    let bookingId;
    try {
      bookingId = await bookingsRepository.create(
        {
          slotId,
          captainId: account.id,
          status: slot.price > 0 ? 'pending' : 'confirmed',
          totalPlaces: slot.capacity,
        },
        client,
      );
    } catch (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw slotTaken();
      }
      throw error;
    }
    return toBooking(await bookingsRepository.findById(bookingId, client));
  });
}

/**
 * The user's bookings, or every booking for the admin.
 * @param {{id: number, role: string}} user
 * @param {{scope: string, page: number, pageSize: number}} query
 * @return {Promise<{items: Array<Object>, meta: Object}>}
 */
async function listBookings(user, query) {
  const { rows, total } = await bookingsRepository.list({
    userId: user.role === 'admin' ? null : user.id,
    scope: query.scope,
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return {
    items: rows.map(toBooking),
    meta: { page: query.page, pageSize: query.pageSize, total },
  };
}

async function getBooking(id, user) {
  const row = await bookingsRepository.findById(id);
  const allowed =
    row !== null &&
    (user.role === 'admin' ||
      (await bookingsRepository.isUserInvolved(id, user.id)));
  if (!allowed) {
    throw new AppError(404, 'NOT_FOUND', 'Rezervarea nu există.');
  }
  return toBooking(row);
}

module.exports = {
  createBooking,
  listBookings,
  getBooking,
};
