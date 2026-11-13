const AppError = require('../errors/app-error');
const facilitiesRepository = require('../repositories/facilities.repository');
const { toFacility } = require('./mappers');

const ALL_STATUSES = ['active', 'maintenance', 'inactive'];

/**
 * @param {string} status 'active' | 'maintenance' | 'inactive' | 'all'
 * @param {?{role: string}} user
 * @return {Promise<Array<Object>>}
 */
async function listFacilities(status, user) {
  if (status !== 'active' && user?.role !== 'admin') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Doar administratorul vede facilitățile inactive.',
    );
  }
  const statuses = status === 'all' ? ALL_STATUSES : [status];
  const rows = await facilitiesRepository.list(statuses);
  return rows.map(toFacility);
}

async function getFacility(id, user) {
  const row = await facilitiesRepository.findById(id);
  if (!row || (row.status === 'inactive' && user?.role !== 'admin')) {
    throw new AppError(404, 'NOT_FOUND', 'Facilitatea nu există.');
  }
  return toFacility(row);
}

module.exports = {
  listFacilities,
  getFacility,
};
