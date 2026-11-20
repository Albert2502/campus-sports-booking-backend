const { Facility, FacilityImage, Sport } = require('../models');

/**
 * Facilities with their sport and images (by position: the first is the
 * thumbnail), sorted by name.
 * @param {{statuses: Array<string>, sportId: (number|undefined)}} filter
 * @return {Promise<Array<import('sequelize').Model>>}
 */
function list({ statuses, sportId }) {
  const where = { status: statuses };
  if (sportId !== undefined) {
    where.sportId = sportId;
  }
  return Facility.findAll({
    where,
    include: [
      { model: Sport, as: 'sport' },
      { model: FacilityImage, as: 'images' },
    ],
    order: [
      ['name', 'ASC'],
      [{ model: FacilityImage, as: 'images' }, 'position', 'ASC'],
      [{ model: FacilityImage, as: 'images' }, 'id', 'ASC'],
    ],
  });
}

module.exports = {
  list,
};
