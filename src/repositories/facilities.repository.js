const { pool } = require('../config/db');

const FACILITY_SELECT = `
  SELECT f.id, f.name, f.location, f.description, f.capacity, f.price_per_hour,
         f.opens_at, f.closes_at, f.status,
         sp.id AS sport_id, sp.name AS sport_name,
         coalesce(
           (SELECT json_agg(
                     json_build_object('id', i.id, 'path', i.path,
                                       'position', i.position)
                     ORDER BY i.position, i.id)
            FROM facility_images i WHERE i.facility_id = f.id),
           '[]'::json
         ) AS images
  FROM facilities f
  JOIN sports sp ON sp.id = f.sport_id`;

/**
 * @param {Array<string>} statuses
 * @return {Promise<Array<Object>>}
 */
async function list(statuses) {
  const { rows } = await pool.query(
    `${FACILITY_SELECT}
     WHERE f.status = ANY($1::facility_status[])
     ORDER BY f.name`,
    [statuses],
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`${FACILITY_SELECT} WHERE f.id = $1`, [id]);
  return rows[0] ?? null;
}

module.exports = {
  list,
  findById,
};
