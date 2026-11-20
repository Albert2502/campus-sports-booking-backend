const path = require('node:path');

const dotenv = require('dotenv');

// A missing .env is fine: the variables can come from the environment.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

/**
 * Reads a variable that the app cannot run without.
 * @param {string} name
 * @return {string}
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT ?? 3000),
  // The Vite dev server; the browser calls the API from there.
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  db: {
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    database: required('DB_NAME'),
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
  },
  // The university is in Romania: "this month" and opening hours use it.
  timeZone: 'Europe/Bucharest',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresInSeconds: 8 * 60 * 60,
  // Only institutional addresses can sign in (seed.sql uses campus.test).
  allowedEmailDomain: required('ALLOWED_EMAIL_DOMAIN').toLowerCase(),
};
