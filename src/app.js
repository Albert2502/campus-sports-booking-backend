const fs = require('node:fs');
const path = require('node:path');

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const routes = require('./routes');

const openapi = YAML.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'openapi.yaml'), 'utf8'),
);

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
