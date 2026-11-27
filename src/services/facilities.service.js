const AppError = require('../errors/app-error');
const facilitiesRepository = require('../repositories/facilities.repository');
const sportsRepository = require('../repositories/sports.repository');

const ALL_STATUSES = ['active', 'maintenance', 'inactive'];

/** PostgreSQL TIME ('08:00:00') to the contract's 'HH:mm'. */
function toHourMinute(time) {
  return time === null ? null : time.slice(0, 5);
}

function notFound() {
  return new AppError(404, 'NOT_FOUND', 'Facilitatea nu există.');
}

/**
 * The `Facility` shape from openapi.yaml.
 * @param {import('sequelize').Model} facility with sport, images and hours
 * @return {Object}
 */
function toFacility(facility) {
  return {
    id: facility.id,
    sport: { id: facility.sport.id, name: facility.sport.name },
    name: facility.name,
    location: facility.location,
    capacity: facility.capacity,
    description: facility.description,
    // NUMERIC comes back from pg as a string.
    pricePerHour: Number(facility.pricePerHour),
    // No rows means no opening-hours restriction (DESIGN §5, 6).
    hours:
      facility.hours.length === 0
        ? null
        : facility.hours.map((day) => ({
            weekday: day.weekday,
            closed: day.isClosed,
            opensAt: toHourMinute(day.opensAt),
            closesAt: toHourMinute(day.closesAt),
          })),
    minBookingMinutes: facility.minBookingMinutes,
    amenities: facility.amenities,
    status: facility.status,
    maintenanceNote: facility.maintenanceNote,
    images: facility.images.map((image) => ({
      id: image.id,
      url: `/uploads/${image.path}`,
      position: image.position,
    })),
  };
}

/**
 * Splits validated input into facility columns and facility_hours rows.
 * `hours` stays undefined when the input does not mention it.
 * @param {Object} input validated FacilityInput
 * @return {{fields: Object, hours: (?Array<Object>|undefined)}}
 */
function toColumns(input) {
  const { hours, ...fields } = input;
  if (hours === undefined || hours === null) {
    return { fields, hours };
  }
  return {
    fields,
    hours: hours.map((day) => ({
      weekday: day.weekday,
      isClosed: day.closed,
      opensAt: day.closed ? null : day.opensAt,
      closesAt: day.closed ? null : day.closesAt,
    })),
  };
}

/**
 * The note belongs to the maintenance status: it is refused with another
 * status and cleared when the facility leaves maintenance (DESIGN §5, 6).
 * @param {Object} fields facility columns about to be saved
 * @param {string} finalStatus the status after the save
 */
function applyMaintenanceNoteRule(fields, finalStatus) {
  if (finalStatus === 'maintenance') {
    return;
  }
  if (fields.maintenanceNote) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Date invalide', {
      fields: {
        maintenanceNote:
          'Motivul se completează doar pentru o facilitate în mentenanță.',
      },
    });
  }
  fields.maintenanceNote = null;
}

async function checkSport(sportId) {
  if (sportId !== undefined && !(await sportsRepository.exists(sportId))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Date invalide', {
      fields: { sportId: 'Sportul ales nu există.' },
    });
  }
}

/** GET /sports. */
async function listSports() {
  const sports = await sportsRepository.list();
  return sports.map((sport) => ({ id: sport.id, name: sport.name }));
}

/**
 * GET /facilities. Only the admin may list other statuses than `active`.
 * @param {{status: string, sportId: (number|undefined)}} query
 * @param {?{id: number, role: string}} user
 * @return {Promise<Array<Object>>}
 */
async function listFacilities({ status, sportId }, user) {
  if (status !== 'active' && user?.role !== 'admin') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Doar administratorul vede facilitățile inactive sau în mentenanță.',
    );
  }
  const statuses = status === 'all' ? ALL_STATUSES : [status];
  const facilities = await facilitiesRepository.list({ statuses, sportId });
  return facilities.map(toFacility);
}

/**
 * GET /facilities/{facilityId}: inactive ones exist only for the admin.
 * @param {number} id
 * @param {?{id: number, role: string}} user
 * @return {Promise<Object>}
 */
async function getFacility(id, user) {
  const facility = await facilitiesRepository.findById(id);
  if (!facility || (facility.status === 'inactive' && user?.role !== 'admin')) {
    throw notFound();
  }
  return toFacility(facility);
}

/**
 * POST /facilities (admin).
 * @param {Object} input validated FacilityInput with the required fields
 * @return {Promise<Object>}
 */
async function createFacility(input) {
  await checkSport(input.sportId);
  const { fields, hours } = toColumns(input);
  applyMaintenanceNoteRule(fields, fields.status ?? 'active');
  const id = await facilitiesRepository.create(fields, hours);
  return toFacility(await facilitiesRepository.findById(id));
}

/**
 * PATCH /facilities/{facilityId} (admin): only the sent fields change.
 * @param {number} id
 * @param {Object} input validated FacilityInput
 * @return {Promise<Object>}
 */
async function updateFacility(id, input) {
  const current = await facilitiesRepository.findById(id);
  if (!current) {
    throw notFound();
  }
  await checkSport(input.sportId);
  const { fields, hours } = toColumns(input);
  applyMaintenanceNoteRule(fields, fields.status ?? current.status);
  await facilitiesRepository.update(id, fields, hours);
  return toFacility(await facilitiesRepository.findById(id));
}

module.exports = {
  listSports,
  listFacilities,
  getFacility,
  createFacility,
  updateFacility,
};
