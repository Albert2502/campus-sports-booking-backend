// SQL fragments shared by the repositories. They expect the aliases
// `s` (time_slots) and `f` (facilities).

const ACTIVE_BOOKING_STATUSES = "('pending', 'confirmed', 'checked_in')";

const SLOT_HAS_CLOSURE = `EXISTS (
  SELECT 1 FROM facility_closures c
  WHERE c.facility_id = f.id
    AND tstzrange(c.starts_at, c.ends_at) && tstzrange(s.starts_at, s.ends_at)
)`;

const SLOT_HAS_ACTIVE_BOOKING = `EXISTS (
  SELECT 1 FROM bookings ab
  WHERE ab.slot_id = s.id AND ab.status IN ${ACTIVE_BOOKING_STATUSES}
)`;

const SLOT_AVAILABILITY = `CASE
  WHEN f.status = 'maintenance' OR ${SLOT_HAS_CLOSURE} THEN 'closed'
  WHEN ${SLOT_HAS_ACTIVE_BOOKING} THEN 'occupied'
  ELSE 'free'
END`;

const SLOT_PRICE = `round(
  (extract(epoch FROM s.ends_at - s.starts_at) / 3600 * f.price_per_hour)::numeric,
  2
)`;

// Relies on the session time zone set in config/db.js.
const SLOT_OUTSIDE_HOURS = `(
  f.opens_at IS NOT NULL
  AND (s.starts_at::time < f.opens_at OR s.ends_at::time > f.closes_at)
)`;

module.exports = {
  SLOT_AVAILABILITY,
  SLOT_HAS_ACTIVE_BOOKING,
  SLOT_HAS_CLOSURE,
  SLOT_OUTSIDE_HOURS,
  SLOT_PRICE,
};
