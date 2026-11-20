const request = require('supertest');

const app = require('../../src/app');

const PASSWORD = 'parola123';

/**
 * Signs in a seed account and returns its token.
 * @param {string} email
 * @param {string=} password
 * @return {Promise<string>}
 */
async function tokenFor(email, password = PASSWORD) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }
  return res.body.token;
}

module.exports = {
  PASSWORD,
  tokenFor,
};
