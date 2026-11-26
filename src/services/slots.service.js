const env = require('../config/env');
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
 * GET /slots: a day (default today) or an interval, with the filters.
 * @param {Object} query validated listSlotsQuery
 * @return {Promise<Array<Object>>}
 */
async function listSlots(query) {
  const rows = await slotsRepository.find({
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

module.exports = {
  listSlots,
};
