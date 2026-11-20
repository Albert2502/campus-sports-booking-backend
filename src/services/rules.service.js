/**
 * The monthly booking limit of a role, or null when it does not apply
 * (admins always; teachers unless `limit_applies_to_teachers`).
 * @param {string} role
 * @param {import('sequelize').Model} rules the booking_rules row
 * @return {?number}
 */
function monthlyLimitFor(role, rules) {
  if (role === 'student') {
    return rules.monthlyBookingLimit;
  }
  if (role === 'teacher' && rules.limitAppliesToTeachers) {
    return rules.monthlyBookingLimit;
  }
  return null;
}

module.exports = {
  monthlyLimitFor,
};
