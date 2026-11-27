const sanctionsService = require('../services/sanctions.service');
const usersService = require('../services/users.service');

async function blockUser(req, res) {
  res
    .status(201)
    .json(
      await sanctionsService.blockUser(req.valid.params.userId, req.valid.body),
    );
}

async function listSanctions(req, res) {
  res.json(await sanctionsService.listUserSanctions(req.valid.params.userId));
}

async function listUsers(req, res) {
  res.json(await usersService.listUsers(req.valid.query));
}

async function getUser(req, res) {
  res.json(await usersService.getUser(req.valid.params.userId));
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
  blockUser,
  listSanctions,
  listUsers,
  getUser,
  getMe,
  changePassword,
};
