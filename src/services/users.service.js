/**
 * The `UserProfile` shape from openapi.yaml.
 * @param {import('sequelize').Model} user
 * @return {Object}
 */
function toProfile(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    blockedUntil: user.blockedUntil,
    createdAt: user.createdAt,
  };
}

module.exports = {
  toProfile,
};
