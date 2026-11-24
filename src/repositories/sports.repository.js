const { Sport } = require('../models');

/** @return {Promise<Array<import('sequelize').Model>>} sorted by name */
function list() {
  return Sport.findAll({ order: [['name', 'ASC']] });
}

/**
 * @param {number} id
 * @return {Promise<boolean>}
 */
async function exists(id) {
  return (await Sport.findByPk(id)) !== null;
}

module.exports = {
  list,
  exists,
};
