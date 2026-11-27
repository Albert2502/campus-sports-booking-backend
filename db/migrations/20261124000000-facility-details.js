// Migration 2: facility details from the Figma form (DESIGN §5, 6) — opening
// hours per weekday, minimum booking length, amenities, maintenance reason.
// The "all 7 days or none" rule for facility_hours is kept by the service,
// which always replaces the whole week in one transaction.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TYPE facility_amenity AS ENUM
        ('vestiare', 'nocturna', 'dus', 'echipament', 'parcare');

      ALTER TABLE facilities
        ADD COLUMN min_booking_minutes INT NOT NULL DEFAULT 60
          CHECK (min_booking_minutes IN (30, 60, 90, 120)),
        ADD COLUMN amenities facility_amenity[] NOT NULL DEFAULT '{}',
        ADD COLUMN maintenance_note VARCHAR(200);

      CREATE TABLE facility_hours (
        facility_id INT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
        is_closed   BOOLEAN NOT NULL DEFAULT FALSE,
        opens_at    TIME,
        closes_at   TIME,
        PRIMARY KEY (facility_id, weekday),
        CHECK (
          (is_closed AND opens_at IS NULL AND closes_at IS NULL)
          OR (NOT is_closed AND opens_at IS NOT NULL AND closes_at > opens_at)
        )
      );

      -- The old single opening hours become the same hours on every day.
      INSERT INTO facility_hours (facility_id, weekday, opens_at, closes_at)
      SELECT f.id, day, f.opens_at, f.closes_at
      FROM facilities f CROSS JOIN generate_series(1, 7) AS day
      WHERE f.opens_at IS NOT NULL;

      -- Also drops the CHECK constraints that use these columns.
      ALTER TABLE facilities DROP COLUMN opens_at, DROP COLUMN closes_at;
    `);
  },

  async down(queryInterface) {
    // Per-day differences cannot be kept: the earliest open day wins.
    await queryInterface.sequelize.query(`
      ALTER TABLE facilities ADD COLUMN opens_at TIME, ADD COLUMN closes_at TIME;
      UPDATE facilities f SET opens_at = h.opens_at, closes_at = h.closes_at
      FROM (
        SELECT DISTINCT ON (facility_id) facility_id, opens_at, closes_at
        FROM facility_hours WHERE NOT is_closed
        ORDER BY facility_id, weekday
      ) h
      WHERE h.facility_id = f.id;
      ALTER TABLE facilities
        ADD CHECK (num_nonnulls(opens_at, closes_at) IN (0, 2)),
        ADD CHECK (closes_at > opens_at);

      DROP TABLE facility_hours;
      ALTER TABLE facilities
        DROP COLUMN min_booking_minutes,
        DROP COLUMN amenities,
        DROP COLUMN maintenance_note;
      DROP TYPE facility_amenity;
    `);
  },
};
