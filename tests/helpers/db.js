const { execSync } = require('node:child_process');
const path = require('node:path');

require('../test-env');

/**
 * Rebuilds the test database from db/schema.sql and db/seed.sql, with the
 * dev passwords (parola123), so every test file starts from the seed data.
 */
function resetDatabase() {
  // Last check before the destructive step, whatever the setup order was.
  if (!process.env.DB_NAME.endsWith('_test')) {
    throw new Error(`Refusing to reset ${process.env.DB_NAME}`);
  }
  execSync('npm run -s db:reset', {
    cwd: path.join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'ignore',
  });
}

module.exports = {
  resetDatabase,
};
