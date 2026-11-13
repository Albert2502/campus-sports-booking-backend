const authService = require('../services/auth.service');

async function login(req, res) {
  const { email, password } = req.valid.body;
  res.json(await authService.login(email, password));
}

module.exports = {
  login,
};
