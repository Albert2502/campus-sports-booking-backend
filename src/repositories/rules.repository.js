const { BookingRule } = require('../models');

/**
 * The single `booking_rules` row.
 * @return {Promise<import('sequelize').Model>}
 */
async function getRules() {
  const rules = await BookingRule.findByPk(1);
  if (!rules) {
    throw new Error('booking_rules has no row; run npm run db:reset');
  }
  return rules;
}

module.exports = {
  getRules,
};
