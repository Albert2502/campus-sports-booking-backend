const { QueryTypes } = require('sequelize');

const { sequelize } = require('../models');

// One query instead of models: availability needs EXISTS checks on bookings
// and closures, and the day boundaries need the local time zone.
const SELECT_SLOTS = `
  SELECT s.id,
         s.facility_id AS "facilityId",
         f.name AS "facilityName",
         sp.name AS "sportName",
         s.starts_at AS "startsAt",
         s.ends_at AS "endsAt",
         s.auction_closes_at AS "auctionClosesAt",
         ROUND(EXTRACT(EPOCH FROM s.ends_at - s.starts_at) / 3600
               * f.price_per_hour, 2) AS price,
         CASE
           WHEN f.status = 'maintenance' OR EXISTS (
             SELECT 1 FROM facility_closures c
             WHERE c.facility_id = s.facility_id
               AND tstzrange(c.starts_at, c.ends_at)
                   && tstzrange(s.starts_at, s.ends_at))
             THEN 'closed'
           WHEN EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.slot_id = s.id
               AND b.status IN ('pending', 'confirmed', 'checked_in'))
             THEN 'occupied'
           ELSE 'free'
         END AS availability
  FROM time_slots s
  JOIN facilities f ON f.id = s.facility_id
  JOIN sports sp ON sp.id = f.sport_id`;

// A facility without facility_hours rows has no opening-hours limit; with
// rows, the slot must fit inside its weekday's hours, on the same local day.
const WITHIN_OPENING_HOURS = `(
  NOT EXISTS (SELECT 1 FROM facility_hours h WHERE h.facility_id = f.id)
  OR EXISTS (
    SELECT 1 FROM facility_hours h
    WHERE h.facility_id = f.id
      AND h.weekday = EXTRACT(ISODOW FROM s.starts_at AT TIME ZONE :tz)
      AND NOT h.is_closed
      AND (s.starts_at AT TIME ZONE :tz)::time >= h.opens_at
      AND s.ends_at AT TIME ZONE :tz
          <= (s.starts_at AT TIME ZONE :tz)::date + h.closes_at))`;

/**
 * Slots with their availability, ordered by facility name and start.
 * Times of day are compared in `filter.timeZone`.
 * @param {{
 *   slotId: (number|undefined),
 *   day: (?string|undefined), rangeFrom: (Date|undefined),
 *   rangeTo: (Date|undefined), facilityId: (number|undefined),
 *   sportId: (number|undefined), fromTime: (string|undefined),
 *   toTime: (string|undefined), onlyFree: (boolean|undefined),
 *   withOutsideHours: boolean, withInactive: boolean, timeZone: string,
 * }} filter without `slotId`, a range or a `day`; `day: null` means today
 * @return {Promise<Array<Object>>} raw rows; `price` is a NUMERIC string
 */
function find(filter) {
  const where = [];
  const replacements = { tz: filter.timeZone };

  if (filter.slotId !== undefined) {
    where.push('s.id = :slotId');
    replacements.slotId = filter.slotId;
  } else if (filter.rangeFrom) {
    where.push('s.starts_at >= :rangeFrom AND s.starts_at < :rangeTo');
    replacements.rangeFrom = filter.rangeFrom;
    replacements.rangeTo = filter.rangeTo;
  } else {
    // A local day, from midnight to midnight.
    where.push(`s.starts_at >= ld.day::timestamp AT TIME ZONE :tz
      AND s.starts_at < (ld.day + 1)::timestamp AT TIME ZONE :tz`);
    replacements.day = filter.day ?? null;
  }
  if (filter.facilityId !== undefined) {
    where.push('s.facility_id = :facilityId');
    replacements.facilityId = filter.facilityId;
  }
  if (filter.sportId !== undefined) {
    where.push('f.sport_id = :sportId');
    replacements.sportId = filter.sportId;
  }
  if (filter.fromTime !== undefined) {
    where.push(
      '(s.starts_at AT TIME ZONE :tz)::time >= CAST(:fromTime AS time)',
    );
    replacements.fromTime = filter.fromTime;
  }
  if (filter.toTime !== undefined) {
    // Against the start's date, so a slot running past midnight is excluded.
    where.push(`s.ends_at AT TIME ZONE :tz
      <= (s.starts_at AT TIME ZONE :tz)::date + CAST(:toTime AS time)`);
    replacements.toTime = filter.toTime;
  }
  if (!filter.withOutsideHours) {
    where.push(WITHIN_OPENING_HOURS);
  }
  if (!filter.withInactive) {
    where.push("f.status <> 'inactive'");
  }

  const localDay =
    'day' in replacements
      ? `CROSS JOIN (SELECT COALESCE(CAST(:day AS date),
           (now() AT TIME ZONE :tz)::date) AS day) ld`
      : '';
  const sql = `
    SELECT * FROM (${SELECT_SLOTS} ${localDay}
      WHERE ${where.join(' AND ')}) slot
    ${filter.onlyFree ? "WHERE slot.availability = 'free'" : ''}
    ORDER BY slot."facilityName", slot."startsAt", slot.id`;
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

module.exports = {
  find,
};
