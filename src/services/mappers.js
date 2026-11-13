// Turn database rows (snake_case) into the API shapes from openapi.yaml.

const HOUR_MS = 60 * 60 * 1000;
const HOLD_MINUTES = 10;

/** PostgreSQL TIME ('08:00:00') to the contract's 'HH:mm'. */
function toHourMinute(time) {
  return time === null ? null : time.slice(0, 5);
}

function toUserSummary(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
  };
}

function toFacility(row) {
  return {
    id: row.id,
    sport: { id: row.sport_id, name: row.sport_name },
    name: row.name,
    location: row.location,
    capacity: row.capacity,
    description: row.description,
    pricePerHour: row.price_per_hour,
    opensAt: toHourMinute(row.opens_at),
    closesAt: toHourMinute(row.closes_at),
    status: row.status,
    images: row.images.map((image) => ({
      id: image.id,
      url: `/uploads/${image.path}`,
      position: image.position,
    })),
  };
}

function toSlot(row) {
  return {
    id: row.id,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    sportName: row.sport_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    availability: row.availability,
    price: row.price,
    auctionClosesAt: row.auction_closes_at,
  };
}

function toBooking(row) {
  const startsAt = row.starts_at;
  return {
    id: row.id,
    slot: toSlot({
      id: row.slot_id,
      facility_id: row.facility_id,
      facility_name: row.facility_name,
      sport_name: row.sport_name,
      starts_at: startsAt,
      ends_at: row.ends_at,
      availability: row.slot_availability,
      price: row.slot_price,
      auction_closes_at: row.auction_closes_at,
    }),
    captain: toUserSummary({
      id: row.captain_id,
      full_name: row.captain_name,
      email: row.captain_email,
      role: row.captain_role,
    }),
    teamId: row.team_id,
    teamName: row.team_name,
    status: row.status,
    totalPlaces: row.total_places,
    joinedPlaces: row.joined_places,
    isOpenMatch: row.is_open_match,
    amountDue: row.slot_price,
    holdExpiresAt:
      row.status === 'pending'
        ? new Date(row.created_at.getTime() + HOLD_MINUTES * 60 * 1000)
        : null,
    freeCancelUntil: new Date(
      startsAt.getTime() - row.free_cancel_hours * HOUR_MS,
    ),
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    checkedInAt: row.checked_in_at,
  };
}

module.exports = {
  toUserSummary,
  toFacility,
  toSlot,
  toBooking,
};
