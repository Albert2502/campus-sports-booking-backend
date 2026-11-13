/**
 * The monthly booking limit for a role, or null when it does not apply.
 * @param {string} role
 * @param {Object} rules a booking_rules row
 * @return {?number}
 */
function monthlyLimitFor(role, rules) {
  if (role === 'student') {
    return rules.monthly_booking_limit;
  }
  if (role === 'teacher' && rules.limit_applies_to_teachers) {
    return rules.monthly_booking_limit;
  }
  return null;
}

module.exports = {
  monthlyLimitFor,
};
