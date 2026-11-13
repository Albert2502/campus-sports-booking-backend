const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const AppError = require('../errors/app-error');
const usersRepository = require('../repositories/users.repository');
const usersService = require('./users.service');

// Compared against when the email is unknown, so both failures take the same
// time and do not reveal which emails have accounts.
const UNKNOWN_USER_HASH = bcrypt.hashSync('unknown-user', 10);

/**
 * @param {string} email
 * @param {string} password
 * @return {Promise<{token: string, expiresAt: Date, user: Object}>}
 */
async function login(email, password) {
  const user = await usersRepository.findByEmail(email);
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password_hash : UNKNOWN_USER_HASH,
  );
  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email sau parolă greșite.');
  }
  const token = jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: env.jwtExpiresInSeconds,
  });
  return {
    token,
    expiresAt: new Date(Date.now() + env.jwtExpiresInSeconds * 1000),
    user: await usersService.getProfile(user.id),
  };
}

module.exports = {
  login,
};
