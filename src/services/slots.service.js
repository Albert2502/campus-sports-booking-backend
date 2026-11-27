const env = require('../config/env');
const AppError = require('../errors/app-error');
const slotsRepository = require('../repositories/slots.repository');

/**
 * The `Slot` shape from openapi.yaml.
 * @param {Object} row from slotsRepository.find
 * @return {Object}
 */
function toSlot(row) {
  return {
    id: row.id,
    facilityId: row.facilityId,
    facilityName: row.facilityName,
    sportName: row.sportName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    availability: row.availability,
    // NUMERIC comes back from pg as a string.
    price: Number(row.price),
    auctionClosesAt: row.auctionClosesAt,
  };
}

/**
 * What the caller may see (DESIGN §3): students and anonymous visitors only
 * the slots inside the opening hours, and only the admin the slots of
 * inactive facilities.
 * @param {?{role: string}} user
 * @return {{withOutsideHours: boolean, withInactive: boolean}}
 */
function visibilityFor(user) {
  return {
    withOutsideHours: user?.role === 'teacher' || user?.role === 'admin',
    withInactive: user?.role === 'admin',
  };
}

/**
 * GET /slots: a day (default today) or an interval, with the filters.
 * @param {Object} query validated listSlotsQuery
 * @param {?{id: number, role: string}} user
 * @return {Promise<Array<Object>>}
 */
async function listSlots(query, user) {
  const rows = await slotsRepository.find({
    ...visibilityFor(user),
    day: query.from ? undefined : (query.date ?? null),
    rangeFrom: query.from,
    rangeTo: query.to,
    facilityId: query.facilityId,
    sportId: query.sportId,
    fromTime: query.fromTime,
    toTime: query.toTime,
    onlyFree: query.available === true,
    timeZone: env.timeZone,
  });
  return rows.map(toSlot);
}

/**
 * GET /slots/{slotId}. A slot the caller may not see answers 404, as if it
 * did not exist (DESIGN §3).
 * @param {number} slotId
 * @param {?{id: number, role: string}} user
 * @return {Promise<Object>}
 */
async function getSlot(slotId, user) {
  const [row] = await slotsRepository.find({
    ...visibilityFor(user),
    slotId,
    timeZone: env.timeZone,
  });
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Intervalul nu există.');
  }
  return toSlot(row);
}

module.exports = {
  listSlots,
  getSlot,
};
