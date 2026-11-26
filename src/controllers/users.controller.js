const usersService = require('../services/users.service');

async function listUsers(req, res) {
  res.json(await usersService.listUsers(req.valid.query));
}

async function getMe(req, res) {
  res.json(await usersService.getProfile(req.user.id));
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  await usersService.changePassword(req.user.id, currentPassword, newPassword);
  res.status(204).end();
}

module.exports = {
  listUsers,
  getMe,
  changePassword,
};
