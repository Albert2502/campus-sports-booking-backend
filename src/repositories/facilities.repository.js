const {
  sequelize,
  Facility,
  FacilityHour,
  FacilityImage,
  Sport,
} = require('../models');

const INCLUDE = [
  { model: Sport, as: 'sport' },
  { model: FacilityImage, as: 'images' },
  { model: FacilityHour, as: 'hours' },
];

// Images by position (the first is the thumbnail), hours Monday to Sunday.
const CHILD_ORDER = [
  [{ model: FacilityImage, as: 'images' }, 'position', 'ASC'],
  [{ model: FacilityImage, as: 'images' }, 'id', 'ASC'],
  [{ model: FacilityHour, as: 'hours' }, 'weekday', 'ASC'],
];

/**
 * Facilities with sport, images and hours, sorted by name.
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
    include: INCLUDE,
    order: [['name', 'ASC'], ...CHILD_ORDER],
  });
}

/**
 * @param {number} id
 * @return {Promise<?import('sequelize').Model>} with sport, images and hours
 */
function findById(id) {
  return Facility.findByPk(id, { include: INCLUDE, order: CHILD_ORDER });
}

/**
 * Replaces the whole week: `null` removes the hours (no restriction).
 * @param {number} facilityId
 * @param {?Array<Object>} hours rows for facility_hours, or null
 * @param {import('sequelize').Transaction} transaction
 */
async function replaceHours(facilityId, hours, transaction) {
  await FacilityHour.destroy({ where: { facilityId }, transaction });
  if (hours) {
    await FacilityHour.bulkCreate(
      hours.map((day) => ({ ...day, facilityId })),
      { transaction },
    );
  }
}

/**
 * @param {Object} fields facility columns
 * @param {?Array<Object>|undefined} hours undefined = no hours row
 * @return {Promise<number>} the new id
 */
function create(fields, hours) {
  return sequelize.transaction(async (transaction) => {
    const facility = await Facility.create(fields, { transaction });
    if (hours) {
      await replaceHours(facility.id, hours, transaction);
    }
    return facility.id;
  });
}

/**
 * @param {number} id
 * @param {Object} fields only the columns to change
 * @param {?Array<Object>|undefined} hours undefined = keep the current hours
 * @return {Promise<void>}
 */
function update(id, fields, hours) {
  return sequelize.transaction(async (transaction) => {
    if (Object.keys(fields).length > 0) {
      await Facility.update(fields, { where: { id }, transaction });
    }
    if (hours !== undefined) {
      await replaceHours(id, hours, transaction);
    }
  });
}

module.exports = {
  list,
  findById,
  create,
  update,
};
