const usersService = require('../services/users.service');

async function getMe(req, res) {
  res.json(await usersService.getProfile(req.user.id));
}

module.exports = {
  getMe,
};
