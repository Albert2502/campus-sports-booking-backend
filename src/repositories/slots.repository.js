const { pool } = require('../config/db');
const sql = require('./sql');

/**
 * Slots of one local day, ordered by facility and start time.
 * @param {{facilityId: ?number, date: ?string, hideOutsideHours: boolean,
 *     includeInactive: boolean}} filters `date` is YYYY-MM-DD; null = today
 * @return {Promise<Array<Object>>}
 */
async function listForDay(filters) {
  const { rows } = await pool.query(
    `SELECT s.id, s.facility_id, s.starts_at, s.ends_at, s.auction_closes_at,
            f.name AS facility_name, sp.name AS sport_name,
            ${sql.SLOT_AVAILABILITY} AS availability,
            ${sql.SLOT_PRICE} AS price
     FROM time_slots s
     JOIN facilities f ON f.id = s.facility_id
     JOIN sports sp ON sp.id = f.sport_id
     WHERE ($1::int IS NULL OR s.facility_id = $1)
       AND s.starts_at >= coalesce($2::date, current_date)::timestamptz
       AND s.starts_at < (coalesce($2::date, current_date) + 1)::timestamptz
       AND (NOT $3 OR NOT ${sql.SLOT_OUTSIDE_HOURS})
       AND ($4 OR f.status <> 'inactive')
     ORDER BY f.name, s.starts_at`,
    [
      filters.facilityId,
      filters.date,
      filters.hideOutsideHours,
      filters.includeInactive,
    ],
  );
  return rows;
}

/**
 * Locks the slot row so two bookings for the same slot are checked one
 * after the other.
 * @param {number} slotId
 * @param {import('pg').PoolClient} client
 * @return {Promise<?Object>}
 */
async function findForBooking(slotId, client) {
  const { rows } = await client.query(
    `SELECT s.id, s.starts_at, s.ends_at, s.auction_closes_at,
            f.id AS facility_id, f.status AS facility_status, f.capacity,
            s.starts_at <= now() AS in_past,
            ${sql.SLOT_OUTSIDE_HOURS} AS outside_hours,
            ${sql.SLOT_HAS_CLOSURE} AS has_closure,
            ${sql.SLOT_HAS_ACTIVE_BOOKING} AS has_active_booking,
            ${sql.SLOT_PRICE} AS price
     FROM time_slots s
     JOIN facilities f ON f.id = s.facility_id
     WHERE s.id = $1
     FOR UPDATE OF s`,
    [slotId],
  );
  return rows[0] ?? null;
}

module.exports = {
  listForDay,
  findForBooking,
};
