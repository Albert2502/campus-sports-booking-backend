const express = require('express');

const { sequelize } = require('../models');
const authRoutes = require('./auth.routes');
const facilitiesRoutes = require('./facilities.routes');
const sportsRoutes = require('./sports.routes');
const usersRoutes = require('./users.routes');

const router = express.Router();

router.get('/health', async (req, res) => {
  await sequelize.authenticate();
  res.json({ status: 'ok', database: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/facilities', facilitiesRoutes);
router.use('/sports', sportsRoutes);

module.exports = router;
