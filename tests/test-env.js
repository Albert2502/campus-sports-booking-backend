// Points the app at the test database before any module reads the config.
// Loaded by Jest (setupFiles, globalSetup) and by tests/helpers/db.js.
const path = require('node:path');

const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const testDatabase = process.env.DB_NAME_TEST || 'campus_sports_test';
// The tests wipe the database they run on, so only a *_test name is allowed.
if (!/^[A-Za-z0-9_]+_test$/.test(testDatabase)) {
  throw new Error('DB_NAME_TEST must be a plain name ending in _test');
}
// Jest loads this file more than once; the first load remembers the dev
// database before DB_NAME is switched.
process.env.DEV_DB_NAME ??= process.env.DB_NAME;
if (testDatabase === process.env.DEV_DB_NAME) {
  throw new Error('DB_NAME_TEST must differ from DB_NAME (see .env.example)');
}
process.env.DB_NAME = testDatabase;
process.env.NODE_ENV = 'test';
