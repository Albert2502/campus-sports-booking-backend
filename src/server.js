const app = require('./app');
const env = require('./config/env');

app.listen(env.port, (error) => {
  if (error) {
    throw error;
  }
  console.log(`API listening on http://localhost:${env.port}/api/v1`);
  console.log(`API docs on http://localhost:${env.port}/api/docs`);
});
