const path = require('node:path');

const dotenv = require('dotenv');

// A missing .env is fine: the variables can come from the environment.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

module.exports = {
  port: Number(process.env.PORT ?? 3000),
  // The Vite dev server; the browser calls the API from there.
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
