const { pool } = require('../config/db');
const sql = require('./sql');

const BOOKING_SELECT = `
  SELECT b.id, b.status, b.total_places, b.is_open_match, b.team_id,
         t.name AS team_name, b.created_at, b.confirmed_at, b.cancelled_at,
         b.cancel_reason, b.checked_in_at,
         s.id AS slot_id, s.starts_at, s.ends_at, s.auction_closes_at,
         f.id AS facility_id, f.name AS facility_name, sp.name AS sport_name,
         ${sql.SLOT_AVAILABILITY} AS slot_availability,
         ${sql.SLOT_PRICE} AS slot_price,
         u.id AS captain_id, u.full_name AS captain_name,
         u.email AS captain_email, u.role AS captain_role,
         (SELECT count(*) FROM booking_participants bp
          WHERE bp.booking_id = b.id AND bp.status = 'joined') AS joined_places,
         r.free_cancel_hours
  FROM bookings b
  JOIN time_slots s ON s.id = b.slot_id
  JOIN facilities f ON f.id = s.facility_id
  JOIN sports sp ON sp.id = f.sport_id
  JOIN users u ON u.id = b.captain_id
  LEFT JOIN teams t ON t.id = b.team_id
  CROSS JOIN booking_rules r`;

// The captain or a participant of the booking.
const IS_INVOLVED = `(b.captain_id = $1 OR EXISTS (
  SELECT 1 FROM booking_participants p
  WHERE p.booking_id = b.id AND p.user_id = $1))`;

/**
 * @param {{slotId: number, captainId: number, status: string,
 *     totalPlaces: number}} booking
 * @param {import('pg').PoolClient} client
 * @return {Promise<number>} the new booking id
 */
async function create(booking, client) {
  const { rows } = await client.query(
    `INSERT INTO bookings (slot_id, captain_id, status, total_places,
                           confirmed_at)
     VALUES ($1, $2, $3, $4,
             CASE WHEN $3::booking_status = 'confirmed' THEN now() END)
     RETURNING id`,
    [booking.slotId, booking.captainId, booking.status, booking.totalPlaces],
  );
  return rows[0].id;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
  return rows[0] ?? null;
}

async function isUserInvolved(bookingId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM bookings b WHERE b.id = $2 AND ${IS_INVOLVED}`,
    [userId, bookingId],
  );
  return rows.length > 0;
}

/**
 * @param {{userId: ?number, scope: string, limit: number, offset: number}}
 *     filters `userId` null = every booking (admin)
 * @return {Promise<{rows: Array<Object>, total: number}>}
 */
async function list(filters) {
  const where = `
    WHERE ($1::int IS NULL OR ${IS_INVOLVED})
      AND ($2 = 'all'
           OR ($2 = 'upcoming' AND s.ends_at > now())
           OR ($2 = 'past' AND s.ends_at <= now()))`;
  const params = [filters.userId, filters.scope];
  const [page, count] = await Promise.all([
    pool.query(
      `${BOOKING_SELECT} ${where}
       ORDER BY s.starts_at ${filters.scope === 'past' ? 'DESC' : 'ASC'}
       LIMIT $3 OFFSET $4`,
      [...params, filters.limit, filters.offset],
    ),
    pool.query(
      `SELECT count(*) AS total
       FROM bookings b JOIN time_slots s ON s.id = b.slot_id ${where}`,
      params,
    ),
  ]);
  return { rows: page.rows, total: count.rows[0].total };
}

module.exports = {
  create,
  findById,
  isUserInvolved,
  list,
};
