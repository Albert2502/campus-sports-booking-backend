const AppError = require('../errors/app-error');
const facilitiesRepository = require('../repositories/facilities.repository');

const ALL_STATUSES = ['active', 'maintenance', 'inactive'];

/** PostgreSQL TIME ('08:00:00') to the contract's 'HH:mm'. */
function toHourMinute(time) {
  return time === null ? null : time.slice(0, 5);
}

/**
 * The `Facility` shape from openapi.yaml.
 * @param {import('sequelize').Model} facility with `sport` and `images`
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
    opensAt: toHourMinute(facility.opensAt),
    closesAt: toHourMinute(facility.closesAt),
    status: facility.status,
    images: facility.images.map((image) => ({
      id: image.id,
      url: `/uploads/${image.path}`,
      position: image.position,
    })),
  };
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

module.exports = {
  listFacilities,
};
