const authService = require('../services/auth.service');
const passwordResetService = require('../services/password-reset.service');

async function login(req, res) {
  const { email, password } = req.valid.body;
  res.json(await authService.login(email, password));
}

async function requestPasswordReset(req, res) {
  await passwordResetService.requestReset(req.valid.body.email);
  res.status(202).end();
}

async function confirmPasswordReset(req, res) {
  const { token, newPassword } = req.valid.body;
  await passwordResetService.confirmReset(token, newPassword);
  res.status(204).end();
}

module.exports = {
  login,
  requestPasswordReset,
  confirmPasswordReset,
};
