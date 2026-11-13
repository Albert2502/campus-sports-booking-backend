const { Pool, types } = require('pg');

const env = require('./env');

const NUMERIC_OID = 1700;
const BIGINT_OID = 20;

// Prices and counts fit safely in a JS number; the API returns them as numbers.
types.setTypeParser(NUMERIC_OID, (value) => Number(value));
types.setTypeParser(BIGINT_OID, (value) => Number(value));

// The session time zone makes date_trunc('month', ...) in v_monthly_bookings
// and the opening-hours checks use local time.
const pool = new Pool({ ...env.db, options: `-c TimeZone=${env.timeZone}` });

// An idle connection closed by the server (restart, `npm run db:reset`) must
// not crash the API; the pool opens a new one on the next query.
pool.on('error', (error) => {
  console.error('PostgreSQL idle connection error:', error.message);
});

/**
 * Runs `work` inside a transaction and returns its result.
 * @param {function(import('pg').PoolClient): Promise<*>} work
 * @return {Promise<*>}
 */
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  withTransaction,
};
