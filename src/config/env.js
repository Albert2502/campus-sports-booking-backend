const path = require('node:path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '..', '.env'));
} catch (error) {
  // Without a .env file the variables can still come from the environment.
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

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
  db: {
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
  },
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresInSeconds: 8 * 60 * 60,
  // The university is in Romania; "today" and opening hours use this zone.
  timeZone: 'Europe/Bucharest',
};
