const { pool } = require('../config/db');

async function getRules(db = pool) {
  const { rows } = await db.query('SELECT * FROM booking_rules WHERE id = 1');
  if (rows.length === 0) {
    throw new Error('booking_rules has no row; run npm run db:reset');
  }
  return rows[0];
}

module.exports = {
  getRules,
};
