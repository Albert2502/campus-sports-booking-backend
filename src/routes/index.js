const express = require('express');

const { sequelize } = require('../models');

const router = express.Router();

router.get('/health', async (req, res) => {
  await sequelize.authenticate();
  res.json({ status: 'ok', database: 'ok' });
});

module.exports = router;
