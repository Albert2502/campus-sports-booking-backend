// Fills the next 14 days with slots for local development: seed.sql has only
// six, in the next three days, so the calendar (screen 02) would look empty.
// Slots last the facility's minimum booking length and follow its opening
// hours (08:00–22:00 when it has none). Running it again adds nothing twice:
// the no-overlap constraint of time_slots skips existing slots.
const env = require('../src/config/env');
const { sequelize } = require('../src/models');

const DAYS = 14;

const INSERT_SLOTS = `
  WITH days AS (
    SELECT (now() AT TIME ZONE :tz)::date + n AS day
    FROM generate_series(0, :lastDay) AS n
  ), open_days AS (
    SELECT f.id AS facility_id, f.min_booking_minutes AS minutes, d.day,
           COALESCE(h.opens_at, TIME '08:00') AS opens_at,
           COALESCE(h.closes_at, TIME '22:00') AS closes_at
    FROM facilities f
    CROSS JOIN days d
    LEFT JOIN facility_hours h
      ON h.facility_id = f.id AND h.weekday = EXTRACT(ISODOW FROM d.day)
    WHERE f.status <> 'inactive'
      AND (h.facility_id IS NULL OR NOT h.is_closed)
  )
  INSERT INTO time_slots (facility_id, starts_at, ends_at)
  SELECT o.facility_id,
         t AT TIME ZONE :tz,
         (t + make_interval(mins => o.minutes)) AT TIME ZONE :tz
  FROM open_days o
  CROSS JOIN LATERAL generate_series(
    o.day + o.opens_at,
    o.day + o.closes_at - make_interval(mins => o.minutes),
    make_interval(mins => o.minutes)) AS t
  WHERE t AT TIME ZONE :tz > now()
  ON CONFLICT DO NOTHING
  RETURNING id`;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:dev-slots is for local databases only.');
  }
  const [rows] = await sequelize.query(INSERT_SLOTS, {
    replacements: { tz: env.timeZone, lastDay: DAYS - 1 },
  });
  console.log(`${rows.length} slots added for the next ${DAYS} days.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
