const { pool } = require('../config/db');

const USER_COLUMNS = `id, email, password_hash, full_name, role, status,
  blocked_until, created_at`;

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Active bookings of the user in the month that contains `moment`, from the
 * v_monthly_bookings view.
 * @param {number} userId
 * @param {Date} moment
 * @param {import('pg').Pool|import('pg').PoolClient=} db
 * @return {Promise<number>}
 */
async function countBookingsInMonth(userId, moment, db = pool) {
  const { rows } = await db.query(
    `SELECT coalesce(sum(bookings_count), 0) AS total
     FROM v_monthly_bookings
     WHERE user_id = $1 AND month = date_trunc('month', $2::timestamptz)`,
    [userId, moment],
  );
  return rows[0].total;
}

module.exports = {
  findByEmail,
  findById,
  countBookingsInMonth,
};
