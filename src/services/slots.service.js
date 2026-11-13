const slotsRepository = require('../repositories/slots.repository');
const { toSlot } = require('./mappers');

/**
 * Slots of one day. Students and visitors do not see slots outside the
 * facility's opening hours; only the admin sees inactive facilities.
 * @param {{facilityId: ?number, date: ?string}} filters
 * @param {?{role: string}} user
 * @return {Promise<Array<Object>>}
 */
async function listSlots(filters, user) {
  const role = user?.role ?? null;
  const rows = await slotsRepository.listForDay({
    facilityId: filters.facilityId ?? null,
    date: filters.date ?? null,
    hideOutsideHours: role === null || role === 'student',
    includeInactive: role === 'admin',
  });
  return rows.map(toSlot);
}

module.exports = {
  listSlots,
};
